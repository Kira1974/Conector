import { ConfigService } from '@nestjs/config';
export declare class SecretsConfigService {
    private configService;
    constructor(configService: ConfigService);
    getClientIdCredibanco(): string;
    getClientSecretCredibanco(): string;
    getMtlsClientCertCredibanco(): string;
    getMtlsClientKeyCredibanco(): string;
}
