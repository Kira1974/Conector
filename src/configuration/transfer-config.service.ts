import { Injectable } from '@nestjs/common';

import { GenericConfigService } from './generic-config.service';

@Injectable()
export class TransferConfigService {
  constructor(private config: GenericConfigService) {}

  getTransferTimeout(): number {
    return this.config.get<number>('transfer.timeoutMs');
  }

  getWebhookPollingStartDelay(): number {
    return this.config.get<number>('transfer.webhookPollingStartDelayMs');
  }

  getPollingInterval(): number {
    return this.config.get<number>('transfer.pollingIntervalMs');
  }

  isPollingEnabled(): boolean {
    return this.config.get<boolean>('transfer.enablePolling');
  }
}
