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
var HttpClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClientService = void 0;
const https_1 = __importDefault(require("https"));
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const themis_1 = require("themis");
const custom_exceptions_1 = require("../../../core/exception/custom.exceptions");
const secrets_config_service_1 = require("../../../configuration/secrets-config.service");
const resilience_config_service_1 = require("../resilience-config.service");
let HttpClientService = HttpClientService_1 = class HttpClientService {
    constructor(configService, loggerService, resilienceConfig, secretsConfig) {
        this.configService = configService;
        this.loggerService = loggerService;
        this.resilienceConfig = resilienceConfig;
        this.secretsConfig = secretsConfig;
        this.logger = this.loggerService.getLogger(HttpClientService_1.name, themis_1.ThLoggerComponent.INFRASTRUCTURE);
        const opts = this.createMtlsOptions();
        const agent = new https_1.default.Agent({ ...opts, keepAlive: true });
        this.client = axios_1.default.create({
            httpsAgent: agent,
            validateStatus: (status) => status < 500
        });
        this.setupInterceptors();
    }
    createMtlsOptions() {
        const opts = {};
        try {
            const clientCert = this.secretsConfig.getMtlsClientCertCredibanco();
            const clientKey = this.secretsConfig.getMtlsClientKeyCredibanco();
            if (clientCert && clientKey) {
                opts.cert = clientCert;
                opts.key = clientKey;
            }
        }
        catch {
            this.logger.warn('mTLS certs not found — running without mTLS (dev).', {
                correlation_id: 'http-client-service'
            });
        }
        return opts;
    }
    setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            return config;
        });
        this.client.interceptors.response.use((response) => {
            return response;
        }, async (error) => {
            this.handleHttpError(error);
            const message = error instanceof Error ? error.message : 'HTTP request failed';
            return Promise.reject(new Error(message));
        });
    }
    get instance() {
        return this.client;
    }
    async request(config, correlationId) {
        try {
            if (correlationId) {
                config.headers = {
                    ...config.headers,
                    'x-correlation-id': correlationId
                };
            }
            const response = await this.client.request(config);
            return response.data;
        }
        catch (error) {
            throw this.transformError(error, config.url || 'unknown', correlationId);
        }
    }
    handleHttpError(error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                this.logger.warn('HTTP request timeout', {
                    url: error.config?.url,
                    timeout: error.config?.timeout,
                    method: error.config?.method
                });
            }
            else if (error.response) {
                this.logger.warn('HTTP error response', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    url: error.config?.url,
                    data: error.response.data
                });
            }
            else {
                this.logger.error('HTTP request failed', {
                    message: error.message,
                    url: error.config?.url,
                    code: error.code
                });
            }
        }
        else if (error instanceof Error) {
            this.logger.error('HTTP request failed', {
                message: error.message,
                url: 'unknown',
                code: 'UNKNOWN'
            });
        }
        else {
            this.logger.error('HTTP request failed with unknown error', {
                error: JSON.stringify(error)
            });
        }
    }
    transformError(error, url, correlationId) {
        if (axios_1.default.isAxiosError(error)) {
            return this.handleAxiosError(error, url, correlationId);
        }
        else if (error instanceof Error) {
            return this.handleGenericError(error, url, correlationId);
        }
        else {
            return this.handleUnknownError(url, correlationId);
        }
    }
    handleAxiosError(error, url, correlationId) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return new custom_exceptions_1.TimeoutException(url, 0, correlationId);
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return new custom_exceptions_1.ExternalServiceException(url, 'Service unavailable', 'CONNECTION_ERROR', correlationId);
        }
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            return new custom_exceptions_1.ExternalServiceException(url, `HTTP ${status}: ${message}`, `HTTP_${status}`, correlationId);
        }
        return new custom_exceptions_1.ExternalServiceException(url, error.message || 'Unknown Axios error', 'AXIOS_ERROR', correlationId);
    }
    handleGenericError(error, url, correlationId) {
        return new custom_exceptions_1.ExternalServiceException(url, error.message || 'Unknown error', 'UNKNOWN_ERROR', correlationId);
    }
    handleUnknownError(url, correlationId) {
        return new custom_exceptions_1.ExternalServiceException(url, 'Unknown error occurred', 'UNKNOWN_ERROR', correlationId);
    }
};
exports.HttpClientService = HttpClientService;
exports.HttpClientService = HttpClientService = HttpClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        themis_1.ThLoggerService,
        resilience_config_service_1.ResilienceConfigService,
        secrets_config_service_1.SecretsConfigService])
], HttpClientService);
//# sourceMappingURL=http-client.service.js.map