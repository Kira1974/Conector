import { ConfigService } from '@nestjs/config';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ThLoggerService } from 'themis';
import { SecretsConfigService } from '@config/secrets-config.service';
import { ResilienceConfigService } from '../resilience-config.service';
export declare class HttpClientService {
    private configService;
    private loggerService;
    private resilienceConfig;
    private secretsConfig;
    private client;
    private logger;
    constructor(configService: ConfigService, loggerService: ThLoggerService, resilienceConfig: ResilienceConfigService, secretsConfig: SecretsConfigService);
    private createMtlsOptions;
    private setupInterceptors;
    get instance(): AxiosInstance;
    request<T>(config: AxiosRequestConfig, correlationId?: string): Promise<T>;
    private handleHttpError;
    private transformError;
    private handleAxiosError;
    private handleGenericError;
    private handleUnknownError;
}
