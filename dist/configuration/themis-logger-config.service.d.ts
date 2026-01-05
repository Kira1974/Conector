import { ThLogLevel } from 'themis';
import { GenericConfigService } from './generic-config.service';
export interface ThemisLoggerConfig {
    environment: string;
    service: string;
    version: string;
    minimumLevel: ThLogLevel;
    format: {
        pretty: boolean;
        colors: boolean;
    };
}
export declare class ThemisLoggerConfigService {
    private config;
    constructor(config: GenericConfigService);
    getLoggerConfig(): ThemisLoggerConfig;
    private mapStringToLogLevel;
}
