import { ExternalServicesConfigService } from '@config/external-services-config.service';
export declare class ResilienceConfigService {
    private externalServicesConfig;
    constructor(externalServicesConfig: ExternalServicesConfigService);
    getDifeTimeout(): number;
    getMolTimeout(): number;
    getOAuthTimeout(): number;
    getOAuthCacheTtl(): number;
}
