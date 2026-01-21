import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';

import { CoreModule } from '../../core/core.module';

import { TransferController } from './rest/transfer.controller';
import { HealthController } from './rest/health.controller';
import { TransferConfirmationController } from './rest/transfer-confirmation.controller';
import { GlobalExceptionFilter } from './rest/interceptors/global-exception.filter';
import { GlobalValidationPipe } from './rest/interceptors/global-validation.pipe';
import { AccountQueryController } from './rest/account-query.controller';

@Module({
  imports: [CoreModule],
  controllers: [TransferController, TransferConfirmationController, HealthController, AccountQueryController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter
    },
    {
      provide: APP_PIPE,
      useClass: GlobalValidationPipe
    }
  ]
})
export class EntrypointModule {}
