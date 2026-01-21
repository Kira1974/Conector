import { GenericConfigService } from './generic-config.service';
export declare class TransferConfigService {
    private config;
    constructor(config: GenericConfigService);
    getTransferTimeout(): number;
    getWebhookPollingStartDelay(): number;
    getPollingInterval(): number;
    isPollingEnabled(): boolean;
    isCleanupIntervalEnabled(): boolean;
}
