import { Injectable } from '@nestjs/common';

import { GenericConfigService } from './generic-config.service';

@Injectable()
export class AppConfigService {
  constructor(private config: GenericConfigService) {}

  getPort(): number {
    return this.config.get<number>('app.port');
  }
}
