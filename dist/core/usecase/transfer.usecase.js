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
const constant_1 = require("../constant");
const provider_1 = require("../provider");
const model_1 = require("../model");
const util_1 = require("../util");
const error_message_mapper_1 = require("../util/error-message.mapper");
const error_constants_util_1 = require("../util/error-constants.util");
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
            let keyResolution;
            let keyResolutionSource;
            const keyResolutionFromRequest = this.extractKeyResolutionFromAdditionalData(request);
            if (this.isKeyResolutionComplete(keyResolutionFromRequest)) {
                this.logger.log('Using keyResolution from request additionalData, skipping DIFE call', {
                    transactionId: request.transaction.id,
                    correlationId: request.transaction.id
                });
                keyResolution = keyResolutionFromRequest;
                keyResolutionSource = 'FROM_REQUEST';
            }
            else {
                this.logger.log('keyResolution not provided or incomplete in additionalData, calling DIFE', {
                    transactionId: request.transaction.id,
                    correlationId: request.transaction.id,
                    hasPartialData: !!keyResolutionFromRequest
                });
                const keyResolutionRequest = this.buildKeyResolutionRequest(request);
                keyResolution = await this.difeProvider.resolveKey(keyResolutionRequest);
                keyResolutionSource = 'FROM_DIFE';
            }
            const difeAdditionalData = (0, util_1.buildAdditionalDataFromKeyResolution)(keyResolution);
            const difeErrorResponse = (0, util_1.buildDifeErrorResponseIfAny)(request, keyResolution);
            if (difeErrorResponse) {
                return difeErrorResponse;
            }
            const paymentResponse = await this.paymentProvider.createPayment(request, keyResolution);
            paymentResponse.additionalData = {
                ...(paymentResponse.additionalData || {}),
                ...difeAdditionalData,
                KEY_RESOLUTION_SOURCE: keyResolutionSource
            };
            const paymentValidation = this.validatePaymentResponse(request, paymentResponse);
            if (paymentValidation.errorResponse) {
                return paymentValidation.errorResponse;
            }
            return this.waitForFinalState(request, paymentResponse, paymentValidation.endToEndId, startedAt);
        }
        catch (error) {
            return this.handleTransferError(error, request.transaction.id);
        }
    }
    extractKeyResolutionFromAdditionalData(request) {
        const accountDetail = request.transaction.payee.account.detail;
        if (!accountDetail) {
            return null;
        }
        const keyValue = accountDetail['KEY_VALUE'];
        const keyType = accountDetail['KEY_TYPE'];
        const participantNit = accountDetail['PARTICIPANT_NIT'];
        const participantSpbvi = accountDetail['PARTICIPANT_SPBVI'];
        const difeTraceId = accountDetail['DIFE_TRACE_ID'];
        if (!keyValue || !keyType || !participantNit || !participantSpbvi) {
            return null;
        }
        const accountType = request.transaction.payee.account.type;
        const accountNumber = request.transaction.payee.account.number;
        const documentType = request.transaction.payee.documentType;
        const documentNumber = request.transaction.payee.documentNumber;
        const payeeName = request.transaction.payee.name;
        const personType = request.transaction.payee.personType;
        if (!accountType || !accountNumber) {
            return null;
        }
        const names = this.parsePayeeName(payeeName);
        const correlationId = (0, util_1.generateCorrelationId)();
        return {
            correlation_id: correlationId,
            trace_id: difeTraceId || '',
            status: 'SUCCESS',
            key: {
                key: {
                    type: keyType,
                    value: keyValue
                },
                participant: {
                    nit: participantNit,
                    spbvi: participantSpbvi
                },
                payment_method: {
                    type: accountType,
                    number: accountNumber
                },
                person: {
                    type: (personType || 'N'),
                    identification: {
                        type: (documentType || 'CC'),
                        number: documentNumber || ''
                    },
                    name: names.firstName
                        ? {
                            first_name: names.firstName,
                            second_name: names.secondName || '',
                            last_name: names.lastName || '',
                            second_last_name: names.secondLastName || ''
                        }
                        : undefined,
                    legal_name: names.legalName
                }
            }
        };
    }
    parsePayeeName(payeeName) {
        if (!payeeName || payeeName.trim() === '') {
            return {};
        }
        const parts = payeeName.trim().split(/\s+/);
        if (parts.length === 1) {
            return { legalName: parts[0] };
        }
        if (parts.length === 2) {
            return { firstName: parts[0], lastName: parts[1] };
        }
        if (parts.length === 3) {
            return { firstName: parts[0], lastName: parts[1], secondLastName: parts[2] };
        }
        if (parts.length >= 4) {
            return {
                firstName: parts[0],
                secondName: parts[1],
                lastName: parts[2],
                secondLastName: parts[3]
            };
        }
        return {};
    }
    isKeyResolutionComplete(keyResolution) {
        if (!keyResolution?.key) {
            return false;
        }
        const key = keyResolution.key;
        return !!(keyResolution.status === 'SUCCESS' &&
            keyResolution.correlation_id &&
            key.key?.type &&
            key.key?.value &&
            key.participant?.nit &&
            key.participant?.spbvi &&
            key.payment_method?.type &&
            key.payment_method?.number);
    }
    buildLogContext(transactionId) {
        return {
            correlationId: transactionId,
            transactionId
        };
    }
    buildKeyResolutionRequest(request) {
        const correlationId = (0, util_1.generateCorrelationId)();
        const keyValue = request.transaction.payee.account.detail?.['KEY_VALUE'];
        const key = keyValue || '';
        const keyType = (0, util_1.calculateKeyType)(key);
        return {
            correlationId,
            key,
            keyType,
            transactionId: request.transaction.id
        };
    }
    validatePaymentResponse(request, paymentResponse) {
        if (paymentResponse.responseCode === transfer_response_dto_1.TransferResponseCode.ERROR) {
            return { errorResponse: paymentResponse };
        }
        const additionalData = paymentResponse.additionalData;
        const endToEndId = additionalData?.[model_1.AdditionalDataKey.END_TO_END];
        if (!endToEndId || endToEndId.trim() === '') {
            this.logger.error('Missing END_TO_END in payment response', {
                ...this.buildLogContext(request.transaction.id)
            });
            return {
                errorResponse: {
                    transactionId: request.transaction.id,
                    responseCode: transfer_response_dto_1.TransferResponseCode.ERROR,
                    message: constant_1.TransferMessage.PAYMENT_PROCESSING_ERROR
                }
            };
        }
        return { endToEndId };
    }
    async waitForFinalState(request, paymentResponse, endToEndId, startedAt) {
        this.logger.log('Waiting for transfer confirmation', {
            eventId: request.transaction.id,
            traceId: request.transaction.id,
            correlationId: endToEndId,
            transactionId: request.transaction.id,
            endToEndId,
            timeoutSeconds: TransferUseCase_1.TRANSFER_TIMEOUT_SECONDS
        });
        try {
            const confirmationResponse = await this.pendingTransferService.waitForConfirmation(request.transaction.id, endToEndId, startedAt);
            const isApproved = confirmationResponse.responseCode === transfer_response_dto_1.TransferResponseCode.APPROVED;
            return {
                transactionId: request.transaction.id,
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
                eventId: request.transaction.id,
                traceId: request.transaction.id,
                correlationId: endToEndId,
                transactionId: request.transaction.id,
                endToEndId,
                error: timeoutMessage
            });
            return {
                transactionId: request.transaction.id,
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
        const errorMessage = error instanceof Error ? error.message : error_constants_util_1.UNKNOWN_ERROR_MESSAGE;
        this.logger.error('Transfer execution failed', error, {
            correlationId: transactionId,
            transactionId
        });
        if (error instanceof custom_exceptions_1.KeyResolutionException) {
            const networkErrorInfo = (0, util_1.extractNetworkErrorInfo)(error.message);
            const errorInfo = networkErrorInfo
                ? { code: networkErrorInfo.code, description: error.message, source: networkErrorInfo.source }
                : { code: undefined, description: error.message, source: 'DIFE' };
            const mappedMessage = error_message_mapper_1.ErrorMessageMapper.mapToMessage(errorInfo);
            const responseCode = (0, util_1.determineResponseCodeFromMessage)(mappedMessage, true, errorInfo);
            return {
                transactionId,
                responseCode,
                message: mappedMessage,
                networkMessage: error.message,
                ...(errorInfo.code && { networkCode: errorInfo.code })
            };
        }
        const errorInfo = (0, util_1.extractNetworkErrorInfo)(errorMessage);
        const networkErrorInfo = errorInfo
            ? { code: errorInfo.code, description: errorMessage, source: errorInfo.source }
            : null;
        const mappedMessage = networkErrorInfo
            ? error_message_mapper_1.ErrorMessageMapper.mapToMessage(networkErrorInfo)
            : constant_1.TransferMessage.UNKNOWN_ERROR;
        const fromProvider = !!errorInfo;
        const responseCode = (0, util_1.determineResponseCodeFromMessage)(mappedMessage, fromProvider, networkErrorInfo);
        return {
            transactionId,
            responseCode,
            message: mappedMessage,
            networkMessage: errorMessage,
            ...(errorInfo?.code && { networkCode: errorInfo.code })
        };
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