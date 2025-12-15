import { ThLoggerService } from 'themis';
import { ExternalServicesConfigService } from '@config/external-services-config.service';
import { LoggingConfigService } from '@config/logging-config.service';
import { SecretsConfigService } from '@config/secrets-config.service';
import { ResilienceConfigService } from '../resilience-config.service';
import { HttpClientService } from './http-client.service';
export interface AuthResponse {
    access_token: string;
    expires_in?: number;
    token_type?: string;
}
export declare class AuthService {
    private http;
    private loggerService;
    private resilienceConfig;
    private externalServicesConfig;
    private loggingConfig;
    private secretsConfig;
    private readonly cache;
    private readonly logger;
    private readonly isCacheEnabled;
    private readonly ENABLE_HTTP_HEADERS_LOG;
    constructor(http: HttpClientService, loggerService: ThLoggerService, resilienceConfig: ResilienceConfigService, externalServicesConfig: ExternalServicesConfigService, loggingConfig: LoggingConfigService, secretsConfig: SecretsConfigService);
    private loadCredentials;
    getToken(): Promise<string>;
    clearCache(): void;
    private redactSensitiveHeaders;
    private handleError;
}
