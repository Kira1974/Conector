import { GenericConfigService } from './generic-config.service';
export declare class LoggingConfigService {
    private config;
    constructor(config: GenericConfigService);
    isHttpHeadersLogEnabled(): boolean;
}
