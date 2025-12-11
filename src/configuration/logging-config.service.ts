import { Injectable } from '@nestjs/common';

import { GenericConfigService } from './generic-config.service';

@Injectable()
export class LoggingConfigService {
  constructor(private config: GenericConfigService) {}

  isHttpHeadersLogEnabled(): boolean {
    return this.config.get<boolean>('logging.enableHttpHeadersLog');
  }
}
