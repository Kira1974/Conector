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
                internalId: request.transactionId,
                value: request.transaction.amount.value,
                baseUrl
            });
            let headers = await this.buildHeaders(baseUrl);
            const timeout = this.resilienceConfig.getMolTimeout();
            const molEventId = request.transactionId;
            const molTraceId = request.transactionId;
            const molRequestCorrelationId = dto.internal_id || request.transactionId;
            const requestLog = (0, network_log_util_1.buildNetworkRequestLog)({
                url,
                method: 'POST',
                requestBody: JSON.stringify(dto, null, 2),
                eventId: molEventId,
                traceId: molTraceId,
                correlationId: molRequestCorrelationId,
                transactionId: request.transactionId,
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
            const molResponseCorrelationId = endToEndId || dto.internal_id || request.transactionId;
            this.logMolPaymentResponse(response, {
                eventId: molEventId,
                traceId: molTraceId,
                correlationId: molResponseCorrelationId,
                transactionId: request.transactionId,
                internalId: dto.internal_id,
                endToEndId
            });
            if (response.status === 401 || response.status === 403) {
                this.logger.warn('MOL request failed with authentication error, clearing token cache and retrying', {
                    eventId: molEventId,
                    traceId: molTraceId,
                    correlationId: molRequestCorrelationId,
                    transactionId: request.transactionId,
                    status: response.status
                });
                this.auth.clearCache();
                headers = await this.buildHeaders(baseUrl);
                response = await this.http.instance.post(url, dto, {
                    headers,
                    timeout
                });
                const retryEndToEndId = response.data?.end_to_end_id;
                const retryMolResponseCorrelationId = retryEndToEndId || dto.internal_id || request.transactionId;
                this.logMolPaymentResponse(response, {
                    eventId: molEventId,
                    traceId: molTraceId,
                    correlationId: retryMolResponseCorrelationId,
                    transactionId: request.transactionId,
                    internalId: dto.internal_id,
                    endToEndId: retryEndToEndId,
                    retry: true
                });
            }
            return this.handlePaymentResponse(response, request, keyResolution);
        }
        catch (error) {
            this.logger.error('Payment creation failed', {
                correlationId: request.transactionId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            if (error instanceof custom_exceptions_1.PaymentProcessingException || error instanceof custom_exceptions_1.ExternalServiceException) {
                throw error;
            }
            throw new custom_exceptions_1.PaymentProcessingException(error instanceof Error ? error.message : 'Unknown error occurred', request.transactionId || '');
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
        if (response.status >= 400) {
            let errorDescription = '';
            if (response.data?.errors && response.data.errors.length > 0) {
                errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
            }
            else if (response.data?.error) {
                errorDescription = response.data.error.description || response.data.error.message || 'Unknown error';
            }
            else {
                errorDescription = `HTTP ${response.status} error`;
            }
            this.logger.error('MOL API returned HTTP error', {
                internalId: request.transactionId,
                httpStatus: response.status,
                errorCode: response.data?.error?.code || response.data?.errors?.[0]?.code,
                errorId: response.data?.error?.id,
                error: errorDescription
            });
            throw new custom_exceptions_1.PaymentProcessingException(errorDescription, request.transactionId || '');
        }
        if (response.data?.status === 'ERROR') {
            let errorDescription = '';
            const errorCode = response.data?.error?.code || response.data?.errors?.[0]?.code;
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
                internalId: request.transactionId,
                errorCode,
                error: errorDescription
            });
            throw new custom_exceptions_1.PaymentProcessingException(errorDescription, request.transactionId || '');
        }
        if (response.data?.error) {
            const errorDescription = response.data.error.description || response.data.error.message || 'MOL API error';
            this.logger.error('MOL API returned error object', {
                internalId: request.transactionId,
                errorCode: response.data.error.code,
                errorId: response.data.error.id,
                error: errorDescription
            });
            throw new custom_exceptions_1.PaymentProcessingException(errorDescription, request.transactionId || '');
        }
        const difeExecutionId = keyResolution.executionId || '';
        const molExecutionId = response.data.execution_id || '';
        const isSuccess = response.data.status === 'PROCESSING' ||
            response.data.status === 'COMPLETED' ||
            response.data.status === 'PENDING';
        return {
            transactionId: request.transactionId,
            responseCode: isSuccess ? dto_1.TransferResponseCode.APPROVED : dto_1.TransferResponseCode.ERROR,
            message: isSuccess ? constant_1.TransferMessage.PAYMENT_INITIATED : constant_1.TransferMessage.PAYMENT_PROCESSING_ERROR,
            networkMessage: undefined,
            networkCode: undefined,
            externalTransactionId: response.data.end_to_end_id,
            additionalData: {
                [model_1.AdditionalDataKey.END_TO_END]: response.data.end_to_end_id,
                [model_1.AdditionalDataKey.DIFE_EXECUTION_ID]: difeExecutionId,
                [model_1.AdditionalDataKey.MOL_EXECUTION_ID]: molExecutionId
            }
        };
    }
    toPaymentRequestDto(request, keyResolution) {
        const currency = request.transaction.amount.currency;
        const resolvedKey = keyResolution.resolvedKey;
        if (!resolvedKey) {
            throw new Error('Key resolution data is missing');
        }
        const payerConfiguration = this.getPayerConfigurationFromEnv();
        const creditorDifeIdentificationType = this.mapIdentificationTypeToMol(resolvedKey.person.identificationType || '');
        const now = (0, util_1.formatTimestampWithoutZ)();
        const keyType = resolvedKey.keyType || 'OTHER';
        return {
            additional_informations: request.transaction.description,
            billing_responsible: 'DEBT',
            initiation_type: 'KEY',
            creditor: {
                identification: {
                    type: creditorDifeIdentificationType,
                    value: resolvedKey.person.identificationNumber
                },
                key: {
                    type: this.mapKeyTypeToMol(keyType),
                    value: resolvedKey.keyValue
                },
                name: [resolvedKey.person.firstName, resolvedKey.person.lastName].filter(Boolean).join(' ') ||
                    resolvedKey.person.legalCompanyName ||
                    '',
                participant: {
                    id: resolvedKey.participant.nit || '',
                    spbvi: resolvedKey.participant.spbvi || ''
                },
                payment_method: {
                    currency,
                    type: this.mapPaymentMethodTypeToMol(resolvedKey.paymentMethod.type || ''),
                    value: resolvedKey.paymentMethod.number || ''
                }
            },
            internal_id: keyResolution.correlationId || '',
            key_resolution_id: keyResolution.traceId || '',
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
            transaction_amount: request.transaction.amount.value.toFixed(2),
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