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
const network_error_extractor_util_1 = require("../util/network-error-extractor.util");
const error_message_mapper_1 = require("../util/error-message.mapper");
const constant_1 = require("../constant");
const standardized_response_code_mapper_1 = require("../../infrastructure/entrypoint/rest/mappers/standardized-response-code.mapper");
let AccountQueryUseCase = AccountQueryUseCase_1 = class AccountQueryUseCase {
    constructor(difeProvider, loggerService) {
        this.difeProvider = difeProvider;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(AccountQueryUseCase_1.name, themis_1.ThLoggerComponent.APPLICATION);
    }
    async execute(keyValue) {
        const keyType = (0, util_1.calculateKeyType)(keyValue);
        const correlationId = (0, util_1.generateCorrelationId)();
        try {
            const request = {
                correlationId,
                key: keyValue,
                keyType
            };
            const difeResponse = await this.difeProvider.resolveKey(request);
            const keyResolution = this.mapDifeResponseToDomain(difeResponse, correlationId);
            const responseDto = this.processKeyResolution(keyResolution, difeResponse, keyValue, keyType, correlationId);
            const httpStatus = responseDto.data?.state
                ? standardized_response_code_mapper_1.StandardizedResponseCodeMapper.mapToHttpStatus(responseDto.data.state, responseDto.networkCode)
                : parseInt(responseDto.code);
            return {
                response: responseDto,
                correlationId,
                difeExecutionId: difeResponse.execution_id,
                httpStatus
            };
        }
        catch (error) {
            const errorResponse = this.handleError(error, correlationId);
            const httpStatus = parseInt(errorResponse.code);
            return {
                response: errorResponse,
                correlationId,
                httpStatus
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
    processKeyResolution(keyResolution, difeResponse, keyValue, keyType, correlationId) {
        if (keyResolution.errors && keyResolution.errors.length > 0) {
            const errorMessage = keyResolution.errors.join(', ');
            this.logger.warn('DIFE returned business validation errors', {
                correlationId,
                difeCorrelationId: keyResolution.correlationId || correlationId,
                errorCount: keyResolution.errors.length,
                errorCodes: keyResolution.errors
            });
            return this.buildErrorResponse(errorMessage);
        }
        if (!keyResolution.resolvedKey) {
            this.logger.error('Key resolution failed - incomplete response from DIFE', {
                correlationId,
                difeCorrelationId: keyResolution.correlationId || correlationId
            });
            return this.buildErrorResponse('Key resolution failed');
        }
        this.logger.log('Key resolved successfully', {
            correlationId,
            difeCorrelationId: keyResolution.correlationId || correlationId,
            difeExecutionId: keyResolution.executionId
        });
        return this.buildSuccessResponse(keyValue, keyType, keyResolution, difeResponse);
    }
    buildSuccessResponse(keyValue, keyType, keyResolution, difeResponse) {
        const resolvedKey = keyResolution.resolvedKey;
        const person = resolvedKey.person;
        const paymentMethod = resolvedKey.paymentMethod;
        const nameParts = [];
        if (person.firstName)
            nameParts.push(person.firstName);
        if (person.secondName)
            nameParts.push(person.secondName);
        if (person.lastName)
            nameParts.push(person.lastName);
        if (person.secondLastName)
            nameParts.push(person.secondLastName);
        const fullName = nameParts.length > 0 ? nameParts.join(' ') : person.legalCompanyName || 'Unknown';
        const accountDetail = {
            KEY_VALUE: keyValue,
            BREB_DIFE_CORRELATION_ID: keyResolution.correlationId || '',
            BREB_DIFE_TRACE_ID: keyResolution.traceId || '',
            BREB_DIFE_EXECUTION_ID: keyResolution.executionId,
            BREB_KEY_TYPE: keyType,
            BREB_PARTICIPANT_NIT: resolvedKey.participant.nit,
            BREB_PARTICIPANT_SPBVI: resolvedKey.participant.spbvi
        };
        const accountInfo = {
            type: paymentMethod.type,
            number: paymentMethod.number,
            detail: accountDetail
        };
        const userData = {
            name: fullName,
            personType: person.personType,
            documentType: person.identificationType,
            documentNumber: person.identificationNumber,
            account: accountInfo
        };
        const data = {
            externalTransactionId: keyResolution.executionId || '',
            state: 'SUCCESFUL',
            userData
        };
        return {
            code: '201',
            message: constant_1.TransferMessage.KEY_RESOLUTION_SUCCESS,
            data
        };
    }
    buildErrorResponse(errorMessage) {
        const errorInfo = (0, network_error_extractor_util_1.extractNetworkErrorInfo)(errorMessage);
        const transferMessage = error_message_mapper_1.ErrorMessageMapper.mapToMessage(errorInfo);
        const networkCode = errorInfo?.code;
        const networkDescription = errorInfo?.description || errorMessage;
        const formattedNetworkMessage = networkCode
            ? error_message_mapper_1.ErrorMessageMapper.formatNetworkErrorMessage(networkDescription, errorInfo?.source || 'DIFE')
            : networkDescription;
        const responseCode = standardized_response_code_mapper_1.StandardizedResponseCodeMapper.determineResponseCode(networkCode);
        const httpStatus = standardized_response_code_mapper_1.StandardizedResponseCodeMapper.mapToHttpStatus(responseCode, networkCode);
        return {
            code: httpStatus.toString(),
            message: transferMessage,
            networkCode,
            networkMessage: formattedNetworkMessage
        };
    }
    handleError(error, correlationId) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.error('Key resolution failed with exception', {
            correlationId,
            error: errorMessage,
            errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        });
        return this.buildErrorResponse(errorMessage);
    }
};
exports.AccountQueryUseCase = AccountQueryUseCase;
exports.AccountQueryUseCase = AccountQueryUseCase = AccountQueryUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_1.IDifeProvider,
        themis_1.ThLoggerService])
], AccountQueryUseCase);
//# sourceMappingURL=account-query.usecase.js.map