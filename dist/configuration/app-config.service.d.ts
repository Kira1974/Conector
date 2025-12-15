import { GenericConfigService } from './generic-config.service';
export declare class AppConfigService {
    private config;
    constructor(config: GenericConfigService);
    getPort(): number;
}
