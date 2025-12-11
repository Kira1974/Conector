import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecretsConfigService {
  constructor(private configService: ConfigService) {}

  getClientIdCredibanco(): string {
    return this.configService.get<string>('secrets.clientIdCredibanco') || process.env.CLIENT_ID_CREDIBANCO || '';
  }

  getClientSecretCredibanco(): string {
    return (
      this.configService.get<string>('secrets.clientSecretCredibanco') || process.env.CLIENT_SECRET_CREDIBANCO || ''
    );
  }

  getMtlsClientCertCredibanco(): string {
    return (
      this.configService.get<string>('secrets.mtlsClientCertCredibanco') ||
      process.env.MTLS_CLIENT_CERT_CREDIBANCO ||
      ''
    );
  }

  getMtlsClientKeyCredibanco(): string {
    return (
      this.configService.get<string>('secrets.mtlsClientKeyCredibanco') || process.env.MTLS_CLIENT_KEY_CREDIBANCO || ''
    );
  }
}
