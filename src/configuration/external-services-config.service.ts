import { Injectable } from '@nestjs/common';

import { GenericConfigService } from './generic-config.service';
import { MountebankConfigService } from './mountebank-config.service';

@Injectable()
export class ExternalServicesConfigService {
  constructor(
    private config: GenericConfigService,
    private mountebankConfig: MountebankConfigService
  ) {}

  private isMountebankEnabled(): boolean {
    try {
      return this.mountebankConfig.isEnabled();
    } catch {
      return false;
    }
  }

  getOAuthBaseUrl(): string {
    if (this.isMountebankEnabled()) {
      const port = this.mountebankConfig.getOAuthPort();
      return `http://localhost:${port}`;
    }
    return this.config.get<string>('externalServices.oauth.baseUrl');
  }

  getOAuthTimeout(): number {
    return this.config.get<number>('externalServices.oauth.timeoutMs');
  }

  getOAuthCacheTtl(): number {
    return this.config.get<number>('externalServices.oauth.cacheTtlSeconds');
  }

  getDifeBaseUrl(): string {
    if (this.isMountebankEnabled()) {
      const port = this.mountebankConfig.getDifePort();
      return `http://localhost:${port}`;
    }
    return this.config.get<string>('externalServices.dife.baseUrl');
  }

  getDifeTimeout(): number {
    return this.config.get<number>('externalServices.dife.timeoutMs');
  }

  getMolBaseUrl(): string {
    if (this.isMountebankEnabled()) {
      const port = this.mountebankConfig.getMolPort();
      return `http://localhost:${port}`;
    }
    return this.config.get<string>('externalServices.mol.baseUrl');
  }

  getMolTimeout(): number {
    return this.config.get<number>('externalServices.mol.timeoutMs');
  }

  getMolQueryTimeout(): number {
    return this.config.get<number>('externalServices.mol.queryTimeoutMs');
  }
}
