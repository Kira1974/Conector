import { GenericConfigService } from './generic-config.service';
export declare class MountebankConfigService {
    private config;
    constructor(config: GenericConfigService);
    isEnabled(): boolean;
    getOAuthPort(): number;
    getDifePort(): number;
    getMolPort(): number;
}
