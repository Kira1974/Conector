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
var AccountQueryUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountQueryUseCase = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const provider_1 = require("../provider");
const util_1 = require("../util");
const custom_exceptions_1 = require("../exception/custom.exceptions");
const error_message_mapper_1 = require("../util/error-message.mapper");
const constant_1 = require("../constant");
let AccountQueryUseCase = AccountQueryUseCase_1 = class AccountQueryUseCase {
    constructor(difeProvider, loggerService) {
        this.difeProvider = difeProvider;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(AccountQueryUseCase_1.name, themis_1.ThLoggerComponent.APPLICATION);
    }
    async execute(key) {
        const keyType = (0, util_1.calculateKeyType)(key);
        const correlationId = (0, util_1.generateCorrelationId)();
        try {
            const request = {
                correlationId,
                key,
                keyType
            };
            const difeResponse = await this.difeProvider.resolveKey(request);
            const keyResolution = this.mapDifeResponseToDomain(difeResponse, correlationId);
            const responseDto = this.processAccountQuery(keyResolution, difeResponse, key, keyType, correlationId);
            return { response: responseDto };
        }
        catch (error) {
            const errorResponse = this.handleError(error, key, keyType, correlationId);
            return { response: errorResponse };
        }
    }
    mapDifeResponseToDomain(difeResponse, fallbackCorrelationId) {
        if (difeResponse.status === 'ERROR' && difeResponse.errors) {
            return {
                correlationId: difeResponse.correlation_id || fallbackCorrelationId,
                executionId: difeResponse.execution_id,
                traceId: difeResponse.trace_id,
                status: difeResponse.status,
                errors: difeResponse.errors.map((e) => `${e.description} (${e.code})`)
            };
        }
        if (!difeResponse.key) {
            return {
                correlationId: difeResponse.correlation_id || fallbackCorrelationId,
                executionId: difeResponse.execution_id,
                traceId: difeResponse.trace_id,
                status: difeResponse.status,
                errors: ['Key resolution failed - no key data in response']
            };
        }
        const difeKey = difeResponse.key;
        return {
            correlationId: difeResponse.correlation_id || fallbackCorrelationId,
            executionId: difeResponse.execution_id,
            traceId: difeResponse.trace_id,
            status: difeResponse.status,
            resolvedKey: {
                keyType: difeKey.key.type,
                keyValue: difeKey.key.value,
                participant: {
                    nit: difeKey.participant.nit,
                    spbvi: difeKey.participant.spbvi
                },
                paymentMethod: {
                    number: difeKey.payment_method.number,
                    type: difeKey.payment_method.type
                },
                person: {
                    identificationNumber: difeKey.person.identification.number,
                    identificationType: difeKey.person.identification.type,
                    legalCompanyName: difeKey.person.legal_name,
                    firstName: difeKey.person.name.first_name,
                    lastName: difeKey.person.name.last_name,
                    secondName: difeKey.person.name.second_name,
                    secondLastName: difeKey.person.name.second_last_name,
                    personType: difeKey.person.type
                }
            }
        };
    }
    processAccountQuery(keyResolution, difeResponse, key, keyType, correlationId) {
        if (keyResolution.errors && keyResolution.errors.length > 0) {
            const errorMessage = keyResolution.errors.join(', ');
            this.logger.warn('DIFE returned business validation errors', {
                correlationId,
                difeCorrelationId: keyResolution.correlationId || correlationId,
                errorCount: keyResolution.errors.length,
                errorCodes: keyResolution.errors
            });
            return this.buildErrorResponse(key, keyType, errorMessage, difeResponse);
        }
        if (!keyResolution.resolvedKey) {
            this.logger.error('Key resolution failed - incomplete response from DIFE', {
                correlationId,
                difeCorrelationId: keyResolution.correlationId || correlationId
            });
            return this.buildErrorResponse(key, keyType, 'Key resolution failed', difeResponse);
        }
        this.logger.log('Key resolved successfully', {
            correlationId,
            difeCorrelationId: keyResolution.correlationId || correlationId,
            difeExecutionId: keyResolution.executionId
        });
        return this.buildSuccessResponse(key, keyType, keyResolution, difeResponse);
    }
    buildSuccessResponse(key, keyType, keyResolution, difeResponse) {
        const resolvedKey = keyResolution.resolvedKey;
        const person = resolvedKey.person;
        const paymentMethod = resolvedKey.paymentMethod;
        const fullName = [person.firstName, person.secondName, person.lastName, person.secondLastName]
            .filter(Boolean)
            .join(' ');
        const data = {
            externalTransactionId: difeResponse.execution_id || '',
            state: constant_1.AccountQueryState.SUCCESSFUL,
            userData: {
                name: fullName,
                personType: person.personType,
                documentType: person.identificationType,
                documentNumber: person.identificationNumber,
                account: {
                    type: paymentMethod.type,
                    number: paymentMethod.number,
                    detail: {
                        KEY_VALUE: key,
                        BREB_DIFE_EXECUTION_ID: difeResponse.execution_id || '',
                        BREB_DIFE_CORRELATION_ID: difeResponse.correlation_id || '',
                        BREB_DIFE_TRACE_ID: difeResponse.trace_id || '',
                        BREB_KEY_TYPE: keyType,
                        BREB_PARTICIPANT_NIT: resolvedKey.participant.nit,
                        BREB_PARTICIPANT_SPBVI: resolvedKey.participant.spbvi
                    }
                }
            }
        };
        return themis_1.ThResponseBuilder.created(data, constant_1.TransferMessage.KEY_RESOLUTION_SUCCESS);
    }
    buildErrorResponse(key, keyType, errorMessage, difeResponse) {
        const errorCodeMatch = errorMessage.match(/\(([A-Z]+-\d{4})\)/) || errorMessage.match(/^([A-Z]+-\d+)/);
        const networkCode = errorCodeMatch ? errorCodeMatch[1] : undefined;
        let networkMessage = errorMessage;
        if (errorCodeMatch) {
            const descriptionMatch = errorMessage.match(/DIFE API error: (.+?) \([A-Z]+-\d{4}\)/);
            if (descriptionMatch) {
                networkMessage = descriptionMatch[1];
            }
            else {
                networkMessage = errorMessage.replace(/^[A-Z]+-\d+:\s*/, '').trim();
            }
        }
        const errorInfo = {
            code: networkCode,
            description: networkMessage,
            source: 'DIFE'
        };
        const transferMessage = error_message_mapper_1.ErrorMessageMapper.mapToMessage(errorInfo);
        const formattedNetworkMessage = networkCode
            ? error_message_mapper_1.ErrorMessageMapper.formatNetworkErrorMessage(networkMessage, 'DIFE')
            : networkMessage;
        const errorState = this.determineErrorState(networkCode);
        const data = {
            externalTransactionId: difeResponse?.execution_id || '',
            state: errorState,
            ...(networkCode && { networkCode }),
            ...(formattedNetworkMessage && { networkMessage: formattedNetworkMessage }),
            userData: {
                account: {
                    detail: {
                        KEY_VALUE: key,
                        BREB_DIFE_EXECUTION_ID: difeResponse?.execution_id || '',
                        BREB_DIFE_CORRELATION_ID: difeResponse?.correlation_id || '',
                        BREB_DIFE_TRACE_ID: difeResponse?.trace_id || '',
                        BREB_KEY_TYPE: keyType
                    }
                }
            }
        };
        return this.buildErrorResponseByNetworkCode(networkCode, transferMessage, data);
    }
    determineErrorState(networkCode) {
        if (!networkCode) {
            return constant_1.AccountQueryState.ERROR;
        }
        if (constant_1.DifeErrorCodes.FORMAT_VALIDATION.includes(networkCode)) {
            return constant_1.AccountQueryState.VALIDATION_FAILED;
        }
        if (constant_1.DifeErrorCodes.BUSINESS_VALIDATION.includes(networkCode)) {
            return constant_1.AccountQueryState.REJECTED_BY_PROVIDER;
        }
        if (constant_1.DifeErrorCodes.SERVICE_ERROR.includes(networkCode) || networkCode.startsWith('DIFE-999')) {
            return constant_1.AccountQueryState.PROVIDER_ERROR;
        }
        return constant_1.AccountQueryState.ERROR;
    }
    buildErrorResponseByNetworkCode(networkCode, message, data) {
        if (!networkCode) {
            return themis_1.ThResponseBuilder.internalError(message, data);
        }
        if (constant_1.DifeErrorCodes.FORMAT_VALIDATION.includes(networkCode)) {
            return themis_1.ThResponseBuilder.badRequest(message, data);
        }
        if (constant_1.DifeErrorCodes.BUSINESS_VALIDATION.includes(networkCode)) {
            return themis_1.ThResponseBuilder.validationError(data, message);
        }
        if (constant_1.DifeErrorCodes.SERVICE_ERROR.includes(networkCode) || networkCode.startsWith('DIFE-999')) {
            return themis_1.ThResponseBuilder.externalServiceError(message, data);
        }
        return themis_1.ThResponseBuilder.internalError(message, data);
    }
    handleError(error, key, keyType, correlationId) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.error('Account query failed with exception', {
            correlationId,
            error: errorMessage,
            errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        });
        if (error instanceof custom_exceptions_1.KeyResolutionException) {
            return this.buildErrorResponse(key, keyType, error.message);
        }
        return this.buildErrorResponse(key, keyType, errorMessage);
    }
};
exports.AccountQueryUseCase = AccountQueryUseCase;
exports.AccountQueryUseCase = AccountQueryUseCase = AccountQueryUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_1.IDifeProvider,
        themis_1.ThLoggerService])
], AccountQueryUseCase);
//# sourceMappingURL=account-query.usecase.js.map