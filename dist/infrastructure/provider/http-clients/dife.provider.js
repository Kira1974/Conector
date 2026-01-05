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
var DifeProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifeProvider = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const custom_exceptions_1 = require("../../../core/exception/custom.exceptions");
const util_1 = require("../../../core/util");
const external_services_config_service_1 = require("../../../configuration/external-services-config.service");
const logging_config_service_1 = require("../../../configuration/logging-config.service");
const resilience_config_service_1 = require("../resilience-config.service");
const network_log_util_1 = require("../util/network-log.util");
const _1 = require("./");
let DifeProvider = DifeProvider_1 = class DifeProvider {
    constructor(http, auth, loggerService, resilienceConfig, externalServicesConfig, loggingConfig) {
        this.http = http;
        this.auth = auth;
        this.loggerService = loggerService;
        this.resilienceConfig = resilienceConfig;
        this.externalServicesConfig = externalServicesConfig;
        this.loggingConfig = loggingConfig;
        this.logger = this.loggerService.getLogger(DifeProvider_1.name, themis_1.ThLoggerComponent.INFRASTRUCTURE);
        this.ENABLE_HTTP_HEADERS_LOG = this.loggingConfig.isHttpHeadersLogEnabled();
    }
    async resolveKey(request) {
        try {
            const c110Timestamp = (0, util_1.formatTimestampWithoutZ)();
            const baseUrl = this.externalServicesConfig.getDifeBaseUrl();
            const url = `${baseUrl}/v1/key/resolve`;
            const c120Timestamp = (0, util_1.formatTimestampWithoutZ)();
            const requestBody = {
                correlation_id: request.correlationId,
                key: {
                    type: (request.keyType || 'O'),
                    value: request.key
                },
                time_marks: {
                    C110: c110Timestamp,
                    C120: c120Timestamp
                }
            };
            const difeEventId = request.transactionId || request.correlationId;
            const difeTraceId = request.transactionId || request.correlationId;
            const difeCorrelationId = request.correlationId;
            let token = await this.auth.getToken();
            let headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            };
            const requestLog = (0, network_log_util_1.buildNetworkRequestLog)({
                url,
                method: 'POST',
                requestBody: JSON.stringify(requestBody, null, 2),
                eventId: difeEventId,
                traceId: difeTraceId,
                correlationId: difeCorrelationId,
                transactionId: request.transactionId,
                headers,
                enableHttpHeadersLog: this.ENABLE_HTTP_HEADERS_LOG
            });
            this.logger.log('NETWORK_REQUEST DIFE', requestLog);
            const timeout = this.resilienceConfig.getDifeTimeout();
            let response = await this.http.instance.post(url, requestBody, {
                headers,
                timeout
            });
            this.logNetworkResponse(response, {
                eventId: difeEventId,
                traceId: difeTraceId,
                correlationId: difeCorrelationId,
                transactionId: request.transactionId
            });
            if (response.status === 401 || response.status === 403) {
                this.logger.warn('DIFE request failed with authentication error, clearing token cache and retrying', {
                    eventId: difeEventId,
                    traceId: difeTraceId,
                    correlationId: difeCorrelationId,
                    transactionId: request.transactionId,
                    status: response.status
                });
                this.auth.clearCache();
                token = await this.auth.getToken();
                headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                };
                response = await this.http.instance.post(url, requestBody, {
                    headers,
                    timeout
                });
                this.logNetworkResponse(response, {
                    eventId: difeEventId,
                    traceId: difeTraceId,
                    correlationId: difeCorrelationId,
                    transactionId: request.transactionId,
                    retry: true
                });
            }
            if (!response.data) {
                this.logger.error('DIFE returned empty response', {
                    correlationId: request.correlationId,
                    key: request.key,
                    status: response.status,
                    headers: response.headers
                });
                throw new custom_exceptions_1.KeyResolutionException(request.key, 'DIFE: Key resolution returned empty response', request.correlationId);
            }
            const responseDto = response.data;
            if (responseDto.status === 'ERROR' && responseDto.errors && responseDto.errors.length > 0) {
                const errorInfo = responseDto.errors[0];
                this.logger.error('DIFE API returned error response', {
                    correlationId: request.correlationId,
                    errorCode: errorInfo?.code,
                    errorDescription: errorInfo?.description,
                    executionId: responseDto.execution_id
                });
            }
            return responseDto;
        }
        catch (error) {
            this.logger.error('Key resolution failed', {
                correlationId: request.correlationId,
                key: request.key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            if (error instanceof custom_exceptions_1.KeyResolutionException || error instanceof custom_exceptions_1.ExternalServiceException) {
                throw error;
            }
            throw new custom_exceptions_1.KeyResolutionException(request.key, error instanceof Error ? error.message : 'Unknown error occurred', request.correlationId);
        }
    }
    logNetworkResponse(response, options) {
        const responseLog = (0, network_log_util_1.buildNetworkResponseLog)(response, options);
        if (response.data?.execution_id) {
            responseLog.externalTransactionId = response.data.execution_id;
        }
        this.logger.log('NETWORK_RESPONSE DIFE', responseLog);
    }
    getDefaultKeyType() {
        return 'O';
    }
};
exports.DifeProvider = DifeProvider;
exports.DifeProvider = DifeProvider = DifeProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [_1.HttpClientService,
        _1.AuthService,
        themis_1.ThLoggerService,
        resilience_config_service_1.ResilienceConfigService,
        external_services_config_service_1.ExternalServicesConfigService,
        logging_config_service_1.LoggingConfigService])
], DifeProvider);
//# sourceMappingURL=dife.provider.js.map