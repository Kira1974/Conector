import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MountebankConfigService } from '../mountebank-config.service';
import { ExternalServicesConfigService } from '../external-services-config.service';
export declare class MountebankService implements OnModuleInit, OnModuleDestroy {
    private mountebankConfig;
    private externalServicesConfig;
    private readonly logger;
    private manager;
    private buildStub;
    private readonly isEnabled;
    private readonly oauthPort;
    private readonly difePort;
    private readonly molPort;
    constructor(mountebankConfig: MountebankConfigService, externalServicesConfig: ExternalServicesConfigService);
    private withTimeout;
    private waitForMountebankReady;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private setupImposters;
    private setupOAuthImposter;
    private createDifeErrorStub;
    private createDifeSuccessStub;
    private createMolErrorStub;
    private createMolGenericErrorStub;
    private createMolSuccessStub;
    private createImposter;
    private setupDifeImposter;
    private setupMolImposter;
}
