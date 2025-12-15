"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TransferUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferUseCase = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const provider_1 = require("../provider");
const model_1 = require("../model");
const util_1 = require("../util");
const error_constants_util_1 = require("../util/error-constants.util");
const constant_1 = require("../constant");
const custom_exceptions_1 = require("../exception/custom.exceptions");
const transfer_request_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-request.dto");
const transfer_response_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-response.dto");
const pending_transfer_service_1 = require("./pending-transfer.service");
let TransferUseCase = TransferUseCase_1 = class TransferUseCase {
    constructor(difeProvider, paymentProvider, pendingTransferService, loggerService) {
        this.difeProvider = difeProvider;
        this.paymentProvider = paymentProvider;
        this.pendingTransferService = pendingTransferService;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(TransferUseCase_1.name, themis_1.ThLoggerComponent.APPLICATION);
    }
    async executeTransfer(request) {
        const startedAt = Date.now();
        try {
            const keyValidation = (0, util_1.validateKeyFormatBeforeResolution)(request);
            if (keyValidation) {
                return keyValidation;
            }
            const keyResolutionRequest = this.buildKeyResolutionRequest(request);
            const keyResolution = await this.difeProvider.resolveKey(keyResolutionRequest);
            const difeAdditionalData = (0, util_1.buildAdditionalDataFromKeyResolution)(keyResolution);
            const validationError = this.validateRequest(request, keyResolution);
            if (validationError) {
                return validationError;
            }
            const paymentResponse = await this.paymentProvider.createPayment(request, keyResolution);
            paymentResponse.additionalData = {
                ...(paymentResponse.additionalData || {}),
                ...difeAdditionalData
            };
            const paymentValidation = this.validatePaymentResponse(request, paymentResponse);
            if (paymentValidation.errorResponse) {
                return paymentValidation.errorResponse;
            }
            return this.waitForFinalState(request, paymentResponse, paymentValidation.endToEndId, startedAt);
        }
        catch (error) {
            return this.handleTransferError(error, request.transactionId);
        }
    }
    validateRequest(request, keyResolution) {
        const difeErrorResponse = (0, util_1.buildDifeErrorResponseIfAny)(request, keyResolution);
        if (difeErrorResponse) {
            return difeErrorResponse;
        }
        const payeeValidationError = (0, util_1.validatePayeeDocumentNumber)(request, keyResolution);
        if (payeeValidationError) {
            this.logger.warn('Payee document number validation failed', {
                ...this.buildLogContext(request.transactionId)
            });
            return payeeValidationError;
        }
        const brebAccountValidationError = (0, util_1.validateBrebAccountNumber)(request, keyResolution);
        if (brebAccountValidationError) {
            this.logger.warn('BREB account number validation failed', {
                ...this.buildLogContext(request.transactionId)
            });
            return brebAccountValidationError;
        }
        return null;
    }
    buildLogContext(transactionId) {
        return {
            correlationId: transactionId,
            transactionId
        };
    }
    buildKeyResolutionRequest(request) {
        const correlationId = (0, util_1.generateCorrelationId)();
        const key = request.transactionParties.payee.accountInfo.value;
        const keyType = (0, util_1.calculateKeyType)(key);
        return {
            correlationId,
            key,
            keyType,
            transactionId: request.transactionId
        };
    }
    validatePaymentResponse(request, paymentResponse) {
        if (paymentResponse.responseCode === transfer_response_dto_1.TransferResponseCode.ERROR) {
            return { errorResponse: paymentResponse };
        }
        const additionalData = paymentResponse.additionalData;
        const endToEndId = additionalData?.[model_1.AdditionalDataKey.END_TO_END];
        if (!endToEndId) {
            this.logger.error('Payment response missing endToEndId', {
                transactionId: request.transactionId,
                externalTransactionId: paymentResponse.externalTransactionId
            });
            return {
                errorResponse: {
                    transactionId: request.transactionId,
                    responseCode: transfer_response_dto_1.TransferResponseCode.ERROR,
                    message: constant_1.TransferMessage.PAYMENT_PROCESSING_ERROR,
                    networkMessage: undefined,
                    networkCode: undefined
                }
            };
        }
        return { endToEndId };
    }
    async waitForFinalState(request, paymentResponse, endToEndId, startedAt) {
        this.logger.log('Waiting for transfer confirmation', {
            eventId: request.transactionId,
            traceId: request.transactionId,
            correlationId: endToEndId,
            transactionId: request.transactionId,
            endToEndId,
            timeoutSeconds: TransferUseCase_1.TRANSFER_TIMEOUT_SECONDS
        });
        try {
            const confirmationResponse = await this.pendingTransferService.waitForConfirmation(request.transactionId, endToEndId, startedAt);
            const isApproved = confirmationResponse.responseCode === transfer_response_dto_1.TransferResponseCode.APPROVED;
            return {
                transactionId: request.transactionId,
                responseCode: confirmationResponse.responseCode,
                message: isApproved ? constant_1.TransferMessage.PAYMENT_APPROVED : constant_1.TransferMessage.PAYMENT_DECLINED,
                networkMessage: confirmationResponse.networkMessage,
                networkCode: confirmationResponse.networkCode,
                externalTransactionId: paymentResponse.externalTransactionId,
                additionalData: paymentResponse.additionalData
            };
        }
        catch (timeoutError) {
            const timeoutMessage = timeoutError instanceof Error ? timeoutError.message : error_constants_util_1.DEFAULT_TIMEOUT_MESSAGE;
            this.logger.warn('Transfer confirmation timeout (controlled)', {
                eventId: request.transactionId,
                traceId: request.transactionId,
                correlationId: endToEndId,
                transactionId: request.transactionId,
                endToEndId,
                error: timeoutMessage
            });
            return {
                transactionId: request.transactionId,
                responseCode: transfer_response_dto_1.TransferResponseCode.PENDING,
                message: constant_1.TransferMessage.PAYMENT_PENDING,
                networkMessage: undefined,
                networkCode: undefined,
                externalTransactionId: paymentResponse.externalTransactionId,
                additionalData: paymentResponse.additionalData
            };
        }
    }
    handleTransferError(error, transactionId) {
        if (error instanceof custom_exceptions_1.KeyResolutionException) {
            const errorMessage = error.message;
            const extractedErrorInfo = (0, util_1.extractNetworkErrorInfo)(errorMessage);
            const errorInfo = extractedErrorInfo || {
                code: undefined,
                description: this.extractNetworkErrorMessageOnly(errorMessage),
                source: 'DIFE'
            };
            return this.buildErrorResponse(transactionId, transfer_response_dto_1.TransferResponseCode.ERROR, constant_1.TransferMessage.KEY_RESOLUTION_ERROR, errorInfo);
        }
        const errorMessage = error instanceof Error ? error.message : error_constants_util_1.UNKNOWN_ERROR_MESSAGE;
        const errorInfo = (0, util_1.extractNetworkErrorInfo)(errorMessage);
        const mappedMessage = util_1.ErrorMessageMapper.mapToMessage(errorInfo);
        const responseCode = (0, util_1.determineResponseCodeFromMessage)(mappedMessage);
        const isDifeValidationErr = (0, util_1.isDifeValidationError)(errorMessage);
        const isMolValidationErr = (0, util_1.isMolValidationError)(errorMessage) || (0, util_1.isMolValidationErrorByCode)(errorInfo);
        if (isDifeValidationErr || isMolValidationErr) {
            const source = isDifeValidationErr ? error_constants_util_1.ERROR_SOURCE_DIFE : error_constants_util_1.ERROR_SOURCE_MOL;
            this.logger.warn(`${source} validation error detected`, {
                ...this.buildLogContext(transactionId),
                error: errorMessage
            });
        }
        else {
            this.logger.error('Transfer execution failed', {
                ...this.buildLogContext(transactionId),
                error: errorMessage
            });
        }
        return this.buildErrorResponse(transactionId, responseCode, mappedMessage, errorInfo);
    }
    buildErrorResponse(transactionId, responseCode, message, errorInfo) {
        const networkMessage = errorInfo
            ? util_1.ErrorMessageMapper.formatNetworkErrorMessage(errorInfo.description, errorInfo.source)
            : undefined;
        return {
            transactionId,
            responseCode,
            message,
            networkMessage,
            networkCode: errorInfo?.code
        };
    }
    extractNetworkErrorMessageOnly(errorMessage) {
        const difeCodePattern = /(DIFE-\d{4})/;
        const difeCodeMatch = errorMessage.match(difeCodePattern);
        if (difeCodeMatch) {
            const code = difeCodeMatch[1];
            const codeIndex = errorMessage.indexOf(code);
            const afterCode = errorMessage.substring(codeIndex + code.length).trim();
            const descriptionMatch = afterCode.match(/^[:\s]*(.+?)(?:\s*\(|$)/);
            if (descriptionMatch) {
                return descriptionMatch[1].trim();
            }
        }
        const technicalErrorPattern = /:\s*(?:Cannot read properties|TypeError|ReferenceError|Error:)\s*.+/i;
        if (technicalErrorPattern.test(errorMessage)) {
            const parts = errorMessage.split(technicalErrorPattern);
            if (parts.length > 0 && parts[0]) {
                const cleanMessage = parts[0].replace(/:\s*$/, '').trim();
                if (cleanMessage.toLowerCase().includes('key resolution')) {
                    return cleanMessage;
                }
            }
        }
        const colonIndex = errorMessage.lastIndexOf(':');
        if (colonIndex > 0) {
            const beforeColon = errorMessage.substring(0, colonIndex).trim();
            const technicalKeywords = ['cannot read', 'typeerror', 'referenceerror', 'undefined', 'null'];
            const hasTechnicalError = technicalKeywords.some((keyword) => errorMessage
                .substring(colonIndex + 1)
                .toLowerCase()
                .includes(keyword));
            if (hasTechnicalError && beforeColon.toLowerCase().includes('key resolution')) {
                return beforeColon;
            }
        }
        return 'Key resolution failed';
    }
};
exports.TransferUseCase = TransferUseCase;
TransferUseCase.TRANSFER_TIMEOUT_SECONDS = 50;
__decorate([
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('transfer').setAction('execute'),
        tags: ['transfer', 'execution']
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transfer_request_dto_1.TransferRequestDto]),
    __metadata("design:returntype", Promise)
], TransferUseCase.prototype, "executeTransfer", null);
exports.TransferUseCase = TransferUseCase = TransferUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_1.IDifeProvider,
        provider_1.IMolPaymentProvider,
        pending_transfer_service_1.PendingTransferService,
        themis_1.ThLoggerService])
], TransferUseCase);
//# sourceMappingURL=transfer.usecase.js.map