import { GenericConfigService } from './generic-config.service';
export interface MolPayerConfiguration {
    identificationType: string;
    identificationValue: string;
    name: string;
    paymentMethodType: string;
    paymentMethodValue: string;
    paymentMethodCurrency: string;
}
export declare class MolPayerConfigService {
    private config;
    constructor(config: GenericConfigService);
    getPayerConfiguration(): MolPayerConfiguration;
}
