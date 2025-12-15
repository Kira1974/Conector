import { GenericConfigService } from './generic-config.service';
import { MountebankConfigService } from './mountebank-config.service';
export declare class ExternalServicesConfigService {
    private config;
    private mountebankConfig;
    constructor(config: GenericConfigService, mountebankConfig: MountebankConfigService);
    private isMountebankEnabled;
    getOAuthBaseUrl(): string;
    getOAuthTimeout(): number;
    getOAuthCacheTtl(): number;
    getDifeBaseUrl(): string;
    getDifeTimeout(): number;
    getMolBaseUrl(): string;
    getMolTimeout(): number;
    getMolQueryTimeout(): number;
}
