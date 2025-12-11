import { Injectable } from '@nestjs/common';

import { GenericConfigService } from './generic-config.service';

@Injectable()
export class MountebankConfigService {
  constructor(private config: GenericConfigService) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('mountebank.enabled');
  }

  getOAuthPort(): number {
    return this.config.get<number>('mountebank.oauthPort');
  }

  getDifePort(): number {
    return this.config.get<number>('mountebank.difePort');
  }

  getMolPort(): number {
    return this.config.get<number>('mountebank.molPort');
  }
}
