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
var MolPaymentProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MolPaymentProvider = void 0;
const url_1 = require("url");
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const custom_exceptions_1 = require("../../../core/exception/custom.exceptions");
const util_1 = require("../../../core/util");
const model_1 = require("../../../core/model");
const constant_1 = require("../../../core/constant");
const external_services_config_service_1 = require("../../../configuration/external-services-config.service");
const logging_config_service_1 = require("../../../configuration/logging-config.service");
const mol_payer_config_service_1 = require("../../../configuration/mol-payer-config.service");
const resilience_config_service_1 = require("../resilience-config.service");
const network_log_util_1 = require("../util/network-log.util");
const dto_1 = require("../../entrypoint/dto");
const _1 = require("./");
let MolPaymentProvider = MolPaymentProvider_1 = class MolPaymentProvider {
    constructor(http, auth, loggerService, resilienceConfig, externalServicesConfig, loggingConfig, molPayerConfig) {
        this.http = http;
        this.auth = auth;
        this.loggerService = loggerService;
        this.resilienceConfig = resilienceConfig;
        this.externalServicesConfig = externalServicesConfig;
        this.loggingConfig = loggingConfig;
        this.molPayerConfig = molPayerConfig;
        this.logger = this.loggerService.getLogger(MolPaymentProvider_1.name, themis_1.ThLoggerComponent.INFRASTRUCTURE);
        this.ENABLE_HTTP_HEADERS_LOG = this.loggingConfig.isHttpHeadersLogEnabled();
    }
    async createPayment(request, keyResolution) {
        try {
            const baseUrl = this.externalServicesConfig.getMolBaseUrl();
            const url = `${baseUrl}/v1/payment`;
            const dto = this.toPaymentRequestDto(request, keyResolution);
            this.logger.log('Creating MOL payment', {
                internalId: request.transaction.id,
                value: request.transaction.amount.total,
                baseUrl
            });
            let headers = await this.buildHeaders(baseUrl);
            const timeout = this.resilienceConfig.getMolTimeout();
            const molEventId = request.transaction.id;
            const molTraceId = request.transaction.id;
            const molRequestCorrelationId = dto.internal_id || request.transaction.id;
            const requestLog = (0, network_log_util_1.buildNetworkRequestLog)({
                url,
                method: 'POST',
                requestBody: JSON.stringify(dto, null, 2),
                eventId: molEventId,
                traceId: molTraceId,
                correlationId: molRequestCorrelationId,
                transactionId: request.transaction.id,
                headers,
                enableHttpHeadersLog: this.ENABLE_HTTP_HEADERS_LOG
            });
            requestLog.internalId = dto.internal_id;
            this.logger.log('NETWORK_REQUEST MOL', requestLog);
            let response = await this.http.instance.post(url, dto, {
                headers,
                timeout
            });
            const endToEndId = response.data?.end_to_end_id;
            const molResponseCorrelationId = endToEndId || dto.internal_id || request.transaction.id;
            this.logMolPaymentResponse(response, {
                eventId: molEventId,
                traceId: molTraceId,
                correlationId: molResponseCorrelationId,
                transactionId: request.transaction.id,
                internalId: dto.internal_id,
                endToEndId
            });
            if (response.status === 401 || response.status === 403) {
                this.logger.warn('MOL request failed with authentication error, clearing token cache and retrying', {
                    eventId: molEventId,
                    traceId: molTraceId,
                    correlationId: molRequestCorrelationId,
                    transactionId: request.transaction.id,
                    status: response.status
                });
                this.auth.clearCache();
                headers = await this.buildHeaders(baseUrl);
                response = await this.http.instance.post(url, dto, {
                    headers,
                    timeout
                });
                const retryEndToEndId = response.data?.end_to_end_id;
                const retryMolResponseCorrelationId = retryEndToEndId || dto.internal_id || request.transaction.id;
                this.logMolPaymentResponse(response, {
                    eventId: molEventId,
                    traceId: molTraceId,
                    correlationId: retryMolResponseCorrelationId,
                    transactionId: request.transaction.id,
                    internalId: dto.internal_id,
                    endToEndId: retryEndToEndId,
                    retry: true
                });
            }
            return this.handlePaymentResponse(response, request, keyResolution);
        }
        catch (error) {
            this.logger.error('Payment creation failed', {
                correlationId: request.transaction.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            if (error instanceof custom_exceptions_1.PaymentProcessingException || error instanceof custom_exceptions_1.ExternalServiceException) {
                throw error;
            }
            throw new custom_exceptions_1.PaymentProcessingException(error instanceof Error ? error.message : 'Unknown error occurred', request.transaction.id || '');
        }
    }
    async queryPaymentStatus(request, timeout) {
        try {
            this.validateQueryRequest(request);
            const baseUrl = this.externalServicesConfig.getMolBaseUrl();
            const url = `${baseUrl}/v1/payments`;
            const queryParams = this.buildQueryParams(request);
            const queryString = new url_1.URLSearchParams(queryParams).toString();
            const fullUrl = queryString ? `${url}?${queryString}` : url;
            this.logger.log('Querying MOL payment status', {
                queryParams,
                baseUrl,
                timeout: timeout || this.resilienceConfig.getMolTimeout()
            });
            let headers = await this.buildHeaders(baseUrl);
            const requestTimeout = timeout || this.resilienceConfig.getMolTimeout();
            const queryCorrelationId = request.end_to_end_id || request.internal_id || 'query-payment-status';
            const queryEventId = request.internal_id || request.end_to_end_id || 'query-payment-status';
            const queryTraceId = queryEventId;
            const requestLog = (0, network_log_util_1.buildNetworkRequestLog)({
                url: fullUrl,
                method: 'GET',
                eventId: queryEventId,
                traceId: queryTraceId,
                correlationId: queryCorrelationId,
                headers,
                enableHttpHeadersLog: this.ENABLE_HTTP_HEADERS_LOG
            });
            if (request.internal_id) {
                requestLog.internalId = request.internal_id;
            }
            if (request.end_to_end_id) {
                requestLog.endToEndId = request.end_to_end_id;
            }
            this.logger.log('NETWORK_REQUEST MOL_QUERY', requestLog);
            let response = await this.http.instance.get(url, {
                headers,
                params: queryParams,
                timeout: requestTimeout
            });
            this.logMolQueryResponse(response, {
                eventId: queryEventId,
                traceId: queryTraceId,
                correlationId: queryCorrelationId,
                internalId: request.internal_id,
                endToEndId: request.end_to_end_id,
                url: fullUrl
            });
            if (response.status === 401 || response.status === 403) {
                this.logger.warn('MOL query request failed with authentication error, clearing token cache and retrying', {
                    eventId: queryEventId,
                    traceId: queryTraceId,
                    correlationId: queryCorrelationId,
                    status: response.status
                });
                this.auth.clearCache();
                headers = await this.buildHeaders(baseUrl);
                response = await this.http.instance.get(url, {
                    headers,
                    params: queryParams,
                    timeout: requestTimeout
                });
                this.logMolQueryResponse(response, {
                    eventId: queryEventId,
                    traceId: queryTraceId,
                    correlationId: queryCorrelationId,
                    internalId: request.internal_id,
                    endToEndId: request.end_to_end_id,
                    url: fullUrl,
                    retry: true
                });
            }
            return this.handleQueryResponse(response);
        }
        catch (error) {
            this.logger.error('Payment status query failed', {
                queryParams: request,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            if (error instanceof custom_exceptions_1.PaymentProcessingException || error instanceof custom_exceptions_1.ExternalServiceException) {
                throw error;
            }
            throw new custom_exceptions_1.PaymentProcessingException(error instanceof Error ? error.message : 'Unknown error occurred', 'query-payment-status');
        }
    }
    async buildHeaders(_baseUrl) {
        const token = await this.auth.getToken();
        return {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
        };
    }
    handleQueryResponse(response) {
        if (response.status >= 400) {
            let errorDescription = '';
            if (response.data?.errors && response.data.errors.length > 0) {
                errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
            }
            else {
                errorDescription = `HTTP ${response.status} error`;
            }
            this.logger.error('MOL Query API returned HTTP error', {
                httpStatus: response.status,
                error: errorDescription
            });
            throw new custom_exceptions_1.PaymentProcessingException(errorDescription, 'query-payment-status');
        }
        return response.data;
    }
    validateQueryRequest(request) {
        const hasAnyParameter = !!(request.created_at_start ||
            request.created_at_end ||
            request.end_to_end_id ||
            request.internal_id);
        if (!hasAnyParameter) {
            throw new custom_exceptions_1.PaymentProcessingException('At least one query parameter must be provided', 'query-payment-status');
        }
        if (request.created_at_start && !request.created_at_end) {
            throw new custom_exceptions_1.PaymentProcessingException('When using created_at.start, created_at.end must also be provided', 'query-payment-status');
        }
        if (request.created_at_end && !request.created_at_start) {
            throw new custom_exceptions_1.PaymentProcessingException('When using created_at.end, created_at.start must also be provided', 'query-payment-status');
        }
        if (request.created_at_start && request.created_at_end) {
            const startDate = new Date(request.created_at_start);
            const endDate = new Date(request.created_at_end);
            const diffInMs = endDate.getTime() - startDate.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            if (diffInDays > 1) {
                throw new custom_exceptions_1.PaymentProcessingException('Date range cannot exceed 1 day', 'query-payment-status');
            }
            if (diffInDays < 0) {
                throw new custom_exceptions_1.PaymentProcessingException('created_at.start must be before created_at.end', 'query-payment-status');
            }
        }
    }
    buildQueryParams(request) {
        const params = {};
        if (request.created_at_start) {
            params['created_at.start'] = request.created_at_start;
        }
        if (request.created_at_end) {
            params['created_at.end'] = request.created_at_end;
        }
        if (request.end_to_end_id) {
            params.end_to_end_id = request.end_to_end_id;
        }
        if (request.internal_id) {
            params.internal_id = request.internal_id;
        }
        return params;
    }
    handlePaymentResponse(response, request, keyResolution) {
        const difeExecutionId = keyResolution.execution_id || '';
        const molExecutionId = response.data?.execution_id || '';
        const endToEndId = response.data?.end_to_end_id;
        const errorCode = response.data?.error?.code || response.data?.errors?.[0]?.code || '';
        const errorMessage = response.data?.error?.description || response.data?.error?.message || '';
        const additionalData = {
            [model_1.AdditionalDataKey.END_TO_END]: endToEndId,
            [model_1.AdditionalDataKey.DIFE_EXECUTION_ID]: difeExecutionId,
            [model_1.AdditionalDataKey.MOL_EXECUTION_ID]: molExecutionId
        };
        if (keyResolution.key) {
            if (keyResolution.key.person?.identification?.number) {
                additionalData.DOCUMENT_NUMBER = keyResolution.key.person.identification.number;
            }
            const firstName = keyResolution.key.person?.name?.first_name || '';
            const lastName = keyResolution.key.person?.name?.last_name || '';
            const fullName = [firstName, lastName].filter(Boolean).join(' ');
            if (fullName) {
                additionalData.OBFUSCATED_NAME = this.obfuscateName(fullName);
            }
            else if (keyResolution.key.person?.legal_name) {
                additionalData.OBFUSCATED_NAME = this.obfuscateName(keyResolution.key.person.legal_name);
            }
            if (keyResolution.key.payment_method?.number) {
                additionalData.ACCOUNT_NUMBER = this.obfuscateAccountNumber(keyResolution.key.payment_method.number);
            }
            if (keyResolution.key.payment_method?.type) {
                additionalData.ACCOUNT_TYPE = keyResolution.key.payment_method.type;
            }
        }
        if (errorCode) {
            additionalData.NETWORK_CODE = errorCode;
        }
        if (errorMessage) {
            additionalData.NETWORK_MESSAGE = errorMessage;
        }
        if (response.status >= 400 && response.status < 500) {
            let errorDescription = '';
            if (response.data?.errors && response.data.errors.length > 0) {
                errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
            }
            else if (response.data?.error) {
                errorDescription = response.data.error.description || response.data.error.message || 'Validation error';
            }
            else {
                errorDescription = `HTTP ${response.status} error`;
            }
            this.logger.error('MOL API returned client error', {
                internalId: request.transaction.id,
                httpStatus: response.status,
                errorCode,
                errorId: response.data?.error?.id,
                error: errorDescription
            });
            const isValidationError = this.isValidationErrorCode(errorCode) || response.status === 400;
            const responseCode = isValidationError ? dto_1.TransferResponseCode.VALIDATION_FAILED : dto_1.TransferResponseCode.REJECTED_BY_PROVIDER;
            const message = isValidationError ? constant_1.TransferMessage.VALIDATION_ERROR : constant_1.TransferMessage.TRANSACTION_REJECTED;
            return {
                transactionId: request.transaction.id,
                responseCode,
                message,
                networkMessage: errorMessage || errorDescription,
                networkCode: errorCode,
                externalTransactionId: endToEndId,
                additionalData
            };
        }
        if (response.status >= 500) {
            let errorDescription = '';
            if (response.data?.errors && response.data.errors.length > 0) {
                errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
            }
            else if (response.data?.error) {
                errorDescription = response.data.error.description || response.data.error.message || 'Provider error';
            }
            else {
                errorDescription = `HTTP ${response.status} error`;
            }
            this.logger.error('MOL API returned server error', {
                internalId: request.transaction.id,
                httpStatus: response.status,
                errorCode,
                errorId: response.data?.error?.id,
                error: errorDescription
            });
            return {
                transactionId: request.transaction.id,
                responseCode: dto_1.TransferResponseCode.PROVIDER_ERROR,
                message: constant_1.TransferMessage.PROVIDER_ERROR,
                networkMessage: errorMessage || errorDescription,
                networkCode: errorCode,
                externalTransactionId: endToEndId,
                additionalData
            };
        }
        if (response.data?.status === 'ERROR') {
            let errorDescription = '';
            if (response.data?.errors && response.data.errors.length > 0) {
                errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
            }
            else if (response.data?.error) {
                const description = response.data.error.description || response.data.error.message || 'Unknown API error';
                errorDescription = errorCode ? `${errorCode}: ${description}` : description;
            }
            else {
                errorDescription = 'Unknown API error';
            }
            this.logger.error('MOL API returned error status', {
                internalId: request.transaction.id,
                errorCode,
                error: errorDescription
            });
            return {
                transactionId: request.transaction.id,
                responseCode: dto_1.TransferResponseCode.ERROR,
                message: constant_1.TransferMessage.PAYMENT_PROCESSING_ERROR,
                networkMessage: errorMessage || errorDescription,
                networkCode: errorCode,
                externalTransactionId: endToEndId,
                additionalData
            };
        }
        if (response.data?.error) {
            const errorDescription = response.data.error.description || response.data.error.message || 'MOL API error';
            this.logger.error('MOL API returned error object', {
                internalId: request.transaction.id,
                errorCode: response.data.error.code,
                errorId: response.data.error.id,
                error: errorDescription
            });
            return {
                transactionId: request.transaction.id,
                responseCode: dto_1.TransferResponseCode.ERROR,
                message: constant_1.TransferMessage.PAYMENT_PROCESSING_ERROR,
                networkMessage: errorDescription,
                networkCode: response.data.error.code,
                externalTransactionId: endToEndId,
                additionalData
            };
        }
        const molStatus = response.data?.status;
        let responseCode;
        let message;
        if (molStatus === 'COMPLETED' || molStatus === 'PROCESSING') {
            responseCode = dto_1.TransferResponseCode.APPROVED;
            message = constant_1.TransferMessage.PAYMENT_APPROVED;
        }
        else if (molStatus === 'PENDING') {
            responseCode = dto_1.TransferResponseCode.PENDING;
            message = constant_1.TransferMessage.PAYMENT_PENDING;
        }
        else {
            this.logger.warn('MOL API returned unknown status', {
                internalId: request.transaction.id,
                status: molStatus
            });
            responseCode = dto_1.TransferResponseCode.ERROR;
            message = constant_1.TransferMessage.PAYMENT_PROCESSING_ERROR;
        }
        return {
            transactionId: request.transaction.id,
            responseCode,
            message,
            networkMessage: undefined,
            networkCode: undefined,
            externalTransactionId: endToEndId,
            additionalData
        };
    }
    isValidationErrorCode(errorCode) {
        const validationErrorCodes = [
            'DIFE-4000', 'DIFE-4001', 'DIFE-5005',
            'DIFE-0007', 'DIFE-5004', 'DIFE-5016', 'DIFE-5018', 'DIFE-5019',
            'MOL-4007', 'MOL-4010',
            'MOL-5005'
        ];
        return validationErrorCodes.includes(errorCode);
    }
    obfuscateName(name) {
        const parts = name.split(' ').filter(Boolean);
        return parts
            .map((part) => {
            if (part.length <= 3) {
                return part.charAt(0) + '*'.repeat(part.length - 1);
            }
            return part.substring(0, 3) + '*'.repeat(part.length - 3);
        })
            .join(' ');
    }
    obfuscateAccountNumber(accountNumber) {
        if (accountNumber.length <= 4) {
            return accountNumber;
        }
        return '****' + accountNumber.slice(-4);
    }
    toPaymentRequestDto(request, keyResolution) {
        const currency = request.transaction.amount.currency;
        const key = keyResolution.key;
        if (!key?.person || !key?.payment_method) {
            throw new Error('Key resolution data is missing');
        }
        const payerConfiguration = this.getPayerConfigurationFromEnv();
        const creditorDifeIdentificationType = this.mapIdentificationTypeToMol(key.person.identification?.type || '');
        const now = (0, util_1.formatTimestampWithoutZ)();
        const keyType = key.key.type || 'OTHER';
        return {
            additional_informations: request.transaction.description,
            billing_responsible: 'DEBT',
            initiation_type: 'KEY',
            creditor: {
                identification: {
                    type: creditorDifeIdentificationType,
                    value: key.person.identification?.number || ''
                },
                key: {
                    type: this.mapKeyTypeToMol(keyType),
                    value: key.key.value
                },
                name: [key.person.name?.first_name, key.person.name?.last_name].filter(Boolean).join(' ') ||
                    key.person.legal_name ||
                    '',
                participant: {
                    id: key.participant.nit || '',
                    spbvi: key.participant.spbvi || ''
                },
                payment_method: {
                    currency,
                    type: this.mapPaymentMethodTypeToMol(key.payment_method.type || ''),
                    value: key.payment_method.number || ''
                }
            },
            internal_id: keyResolution.correlation_id || '',
            key_resolution_id: keyResolution.trace_id || '',
            payer: {
                identification: {
                    type: payerConfiguration.identificationType,
                    value: payerConfiguration.identificationValue
                },
                name: payerConfiguration.name,
                payment_method: {
                    currency: payerConfiguration.paymentMethodCurrency,
                    type: payerConfiguration.paymentMethodType,
                    value: payerConfiguration.paymentMethodValue
                }
            },
            qr_code_id: '',
            time_mark: {
                T110: now,
                T120: now
            },
            transaction_amount: request.transaction.amount.total.toFixed(2),
            transaction_type: 'BREB'
        };
    }
    getPayerConfigurationFromEnv() {
        return this.molPayerConfig.getPayerConfiguration();
    }
    mapKeyTypeToMol(keyType) {
        const keyTypeMap = {
            NRIC: 'IDENTIFICATION',
            M: 'PHONE',
            E: 'MAIL',
            O: 'ALPHANUMERIC',
            B: 'MERCHANT_CODE'
        };
        return keyTypeMap[keyType] || keyType;
    }
    mapIdentificationTypeToMol(difeType) {
        const identificationMap = {
            CC: 'CITIZENSHIP_ID',
            CE: 'FOREIGNER_ID',
            NIT: 'TAX_ID',
            NUIP: 'PERSONAL_ID',
            PPT: 'TEMPORARY_PROTECTION_ID',
            PEP: 'SPECIAL_RESIDENCE_ID',
            PAS: 'PASSPORT',
            TDI: 'IDENTITY_CARD'
        };
        return identificationMap[difeType] || difeType;
    }
    mapPaymentMethodTypeToMol(difeType) {
        const paymentMethodMap = {
            CAHO: 'SAVINGS_ACCOUNT',
            CCTE: 'CHECKING_ACCOUNT',
            DBMO: 'LOW_AMOUNT_DEPOSIT',
            DORD: 'REGULAR_DEPOSIT',
            DBMI: 'INCLUSIVE_AMOUNT_DEPOSIT'
        };
        return paymentMethodMap[difeType] || difeType;
    }
    logMolPaymentResponse(response, options) {
        const responseLog = (0, network_log_util_1.buildNetworkResponseLog)(response, {
            eventId: options.eventId,
            traceId: options.traceId,
            correlationId: options.correlationId,
            transactionId: options.transactionId,
            retry: options.retry
        });
        responseLog.internalId = options.internalId;
        if (options.endToEndId) {
            responseLog.externalTransactionId = options.endToEndId;
            responseLog.endToEndId = options.endToEndId;
        }
        if (response.data?.execution_id) {
            responseLog.executionId = response.data.execution_id;
        }
        this.logger.log('NETWORK_RESPONSE MOL', responseLog);
    }
    logMolQueryResponse(response, options) {
        const responseLog = (0, network_log_util_1.buildNetworkResponseLog)(response, {
            eventId: options.eventId,
            traceId: options.traceId,
            correlationId: options.correlationId,
            retry: options.retry
        });
        responseLog.url = options.url;
        responseLog.method = 'GET';
        if (options.internalId) {
            responseLog.internalId = options.internalId;
        }
        if (options.endToEndId) {
            responseLog.endToEndId = options.endToEndId;
        }
        this.logger.log('NETWORK_RESPONSE MOL_QUERY', responseLog);
    }
};
exports.MolPaymentProvider = MolPaymentProvider;
__decorate([
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('payment').setAction('create'),
        tags: ['payment', 'mol', 'create']
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.TransferRequestDto, Object]),
    __metadata("design:returntype", Promise)
], MolPaymentProvider.prototype, "createPayment", null);
exports.MolPaymentProvider = MolPaymentProvider = MolPaymentProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_1.HttpClientService,
        _1.AuthService,
        themis_1.ThLoggerService,
        resilience_config_service_1.ResilienceConfigService,
        external_services_config_service_1.ExternalServicesConfigService,
        logging_config_service_1.LoggingConfigService,
        mol_payer_config_service_1.MolPayerConfigService])
], MolPaymentProvider);
//# sourceMappingURL=mol-payment-provider.js.map