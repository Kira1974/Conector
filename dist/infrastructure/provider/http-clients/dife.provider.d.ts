import { ThLoggerService } from 'themis';
import { KeyResolutionRequest } from '@core/model';
import { ExternalServicesConfigService } from '@config/external-services-config.service';
import { LoggingConfigService } from '@config/logging-config.service';
import { ResilienceConfigService } from '../resilience-config.service';
import { DifeKeyResponseDto } from './dto';
import { AuthService, HttpClientService } from './';
export declare class DifeProvider {
    private readonly http;
    private readonly auth;
    private readonly loggerService;
    private readonly resilienceConfig;
    private readonly externalServicesConfig;
    private readonly loggingConfig;
    private readonly logger;
    private readonly ENABLE_HTTP_HEADERS_LOG;
    constructor(http: HttpClientService, auth: AuthService, loggerService: ThLoggerService, resilienceConfig: ResilienceConfigService, externalServicesConfig: ExternalServicesConfigService, loggingConfig: LoggingConfigService);
    resolveKey(request: KeyResolutionRequest): Promise<DifeKeyResponseDto>;
    private logNetworkResponse;
    private getDefaultKeyType;
}
