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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const https_1 = __importDefault(require("https"));
const axios_1 = require("axios");
const common_1 = require("@nestjs/common");
const node_cache_1 = __importDefault(require("node-cache"));
const themis_1 = require("themis");
const external_services_config_service_1 = require("../../../configuration/external-services-config.service");
const logging_config_service_1 = require("../../../configuration/logging-config.service");
const secrets_config_service_1 = require("../../../configuration/secrets-config.service");
const resilience_config_service_1 = require("../resilience-config.service");
const http_client_service_1 = require("./http-client.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(http, loggerService, resilienceConfig, externalServicesConfig, loggingConfig, secretsConfig) {
        this.http = http;
        this.loggerService = loggerService;
        this.resilienceConfig = resilienceConfig;
        this.externalServicesConfig = externalServicesConfig;
        this.loggingConfig = loggingConfig;
        this.secretsConfig = secretsConfig;
        this.cache = new node_cache_1.default();
        this.isCacheEnabled = true;
        this.logger = this.loggerService.getLogger(AuthService_1.name, themis_1.ThLoggerComponent.INFRASTRUCTURE);
        this.ENABLE_HTTP_HEADERS_LOG = this.loggingConfig.isHttpHeadersLogEnabled();
    }
    loadCredentials() {
        try {
            const authClientId = this.secretsConfig.getClientIdCredibanco();
            const authClientSecret = this.secretsConfig.getClientSecretCredibanco();
            const msslClientCert = this.secretsConfig.getMtlsClientCertCredibanco();
            const msslClientKey = this.secretsConfig.getMtlsClientKeyCredibanco();
            if (!authClientId || !authClientSecret) {
                throw new common_1.InternalServerErrorException('Auth client credentials configuration error');
            }
            if (!msslClientCert || !msslClientKey) {
                throw new common_1.InternalServerErrorException('Auth client certificates configuration error');
            }
            return {
                authClientId,
                authClientSecret,
                msslClientCert,
                msslClientKey
            };
        }
        catch (error) {
            this.handleError(error);
        }
    }
    async getToken() {
        try {
            if (this.isCacheEnabled) {
                const cachedToken = this.cache.get('auth_token');
                if (cachedToken) {
                    this.logger.log('NETWORK_RESPONSE AUTH', {
                        status: 200,
                        statusText: 'OK',
                        cached: true,
                        responseData: {
                            access_token: '***REDACTED***',
                            token_type: 'Bearer',
                            expires_in: undefined
                        }
                    });
                    return cachedToken;
                }
            }
            const credentials = this.loadCredentials();
            const oauthBaseUrl = this.externalServicesConfig.getOAuthBaseUrl();
            if (!oauthBaseUrl)
                throw new common_1.InternalServerErrorException('Configuration error base URL missing');
            const url = `${oauthBaseUrl}/token?grant_type=client_credentials`;
            const basicAuth = Buffer.from(`${credentials.authClientId}:${credentials.authClientSecret}`).toString('base64');
            let httpsAgent = undefined;
            if (credentials.msslClientCert && credentials.msslClientKey) {
                httpsAgent = new https_1.default.Agent({
                    cert: credentials.msslClientCert,
                    key: credentials.msslClientKey,
                    keepAlive: true
                });
            }
            const queryParams = '{}';
            const timeout = this.resilienceConfig.getOAuthTimeout();
            const requestHeaders = {
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            const safeRequestHeaders = {
                Authorization: 'Basic ***REDACTED***',
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            const requestLog = {
                url,
                method: 'POST'
            };
            if (this.ENABLE_HTTP_HEADERS_LOG) {
                requestLog.headers = requestHeaders;
            }
            else {
                requestLog.headers = safeRequestHeaders;
            }
            this.logger.log('NETWORK_REQUEST AUTH', requestLog);
            const res = await this.http.instance.post(url, queryParams, {
                httpsAgent,
                timeout,
                headers: requestHeaders
            });
            const safeResponseHeaders = res.headers ? this.redactSensitiveHeaders(res.headers) : {};
            this.logger.log('NETWORK_RESPONSE AUTH', {
                status: res.status,
                statusText: res.statusText,
                responseHeaders: safeResponseHeaders,
                responseData: {
                    access_token: res.data?.access_token ? '***REDACTED***' : undefined,
                    token_type: res.data?.token_type,
                    expires_in: res.data?.expires_in
                }
            });
            if (!res.data?.access_token) {
                throw new common_1.UnauthorizedException('invalid token');
            }
            const token = res.data.access_token;
            const cacheTimeInSeconds = this.resilienceConfig.getOAuthCacheTtl();
            if (this.isCacheEnabled) {
                this.cache.set('auth_token', token, cacheTimeInSeconds);
            }
            return token;
        }
        catch (error) {
            this.handleError(error);
        }
    }
    clearCache() {
        this.cache.flushAll();
    }
    redactSensitiveHeaders(headers) {
        if (!headers) {
            return {};
        }
        const sensitiveHeaders = ['authorization', 'x-api-key', 'x-auth-token', 'cookie', 'set-cookie'];
        const safeHeaders = {};
        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveHeaders.some((sensitive) => lowerKey.includes(sensitive))) {
                safeHeaders[key] = '***REDACTED***';
            }
            else {
                safeHeaders[key] = value;
            }
        }
        return safeHeaders;
    }
    handleError(error) {
        if (error instanceof common_1.UnauthorizedException || error instanceof common_1.InternalServerErrorException) {
            throw error;
        }
        if (error instanceof axios_1.AxiosError) {
            const { status } = error.response;
            if (status === 401 || status === 403) {
                throw new common_1.UnauthorizedException('invalid credentials');
            }
            throw new common_1.InternalServerErrorException('connection error');
        }
        throw new common_1.InternalServerErrorException(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [http_client_service_1.HttpClientService,
        themis_1.ThLoggerService,
        resilience_config_service_1.ResilienceConfigService,
        external_services_config_service_1.ExternalServicesConfigService,
        logging_config_service_1.LoggingConfigService,
        secrets_config_service_1.SecretsConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map