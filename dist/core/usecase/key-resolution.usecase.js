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
var KeyResolutionUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyResolutionUseCase = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const provider_1 = require("../provider");
const util_1 = require("../util");
const custom_exceptions_1 = require("../exception/custom.exceptions");
const error_message_mapper_1 = require("../util/error-message.mapper");
const constant_1 = require("../constant");
let KeyResolutionUseCase = KeyResolutionUseCase_1 = class KeyResolutionUseCase {
    constructor(difeProvider, loggerService) {
        this.difeProvider = difeProvider;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(KeyResolutionUseCase_1.name, themis_1.ThLoggerComponent.APPLICATION);
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
            const responseDto = this.processKeyResolution(keyResolution, difeResponse, key, keyType, correlationId);
            return {
                response: responseDto,
                correlationId,
                difeExecutionId: difeResponse.execution_id
            };
        }
        catch (error) {
            const errorResponse = this.handleError(error, key, keyType, correlationId);
            return {
                response: errorResponse,
                correlationId
            };
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
    processKeyResolution(keyResolution, difeResponse, key, keyType, correlationId) {
        if (keyResolution.errors && keyResolution.errors.length > 0) {
            const errorMessage = keyResolution.errors.join(', ');
            this.logger.warn('DIFE returned business validation errors', {
                correlationId,
                difeCorrelationId: keyResolution.correlationId || correlationId,
                errorCount: keyResolution.errors.length,
                errorCodes: keyResolution.errors
            });
            return this.buildErrorResponse(key, keyType, errorMessage);
        }
        if (!keyResolution.resolvedKey) {
            this.logger.error('Key resolution failed - incomplete response from DIFE', {
                correlationId,
                difeCorrelationId: keyResolution.correlationId || correlationId
            });
            return this.buildErrorResponse(key, keyType, 'Key resolution failed');
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
        const additionalData = (0, util_1.buildAdditionalDataFromKeyResolution)(difeResponse);
        const personName = additionalData.OBFUSCATED_NAME || '';
        const accountNumber = additionalData.ACCOUNT_NUMBER || '';
        return {
            documentNumber: person.identificationNumber,
            documentType: person.identificationType,
            personName,
            personType: person.personType,
            financialEntityNit: resolvedKey.participant.nit,
            accountType: paymentMethod.type,
            accountNumber,
            key,
            keyType,
            responseCode: 'SUCCESS',
            message: constant_1.TransferMessage.KEY_RESOLUTION_SUCCESS
        };
    }
    buildErrorResponse(key, keyType, errorMessage) {
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
        const responseCode = this.determineResponseCode(networkCode);
        return {
            key,
            keyType,
            responseCode,
            message: transferMessage,
            networkCode,
            networkMessage: formattedNetworkMessage
        };
    }
    determineResponseCode(networkCode) {
        if (!networkCode) {
            return 'ERROR';
        }
        const formatValidationErrors = ['DIFE-4000', 'DIFE-5005'];
        if (formatValidationErrors.includes(networkCode)) {
            return 'VALIDATION_FAILED';
        }
        return 'ERROR';
    }
    handleError(error, key, keyType, correlationId) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.error('Key resolution failed with exception', {
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
exports.KeyResolutionUseCase = KeyResolutionUseCase;
exports.KeyResolutionUseCase = KeyResolutionUseCase = KeyResolutionUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_1.IDifeProvider,
        themis_1.ThLoggerService])
], KeyResolutionUseCase);
//# sourceMappingURL=key-resolution.usecase.js.map