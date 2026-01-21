import { Module } from '@nestjs/common';

import { ProviderModule } from '../infrastructure/provider/provider.module';

import { ConfirmationUseCase } from './usecase/confirmation.usecase';
import { TransferUseCase } from './usecase/transfer.usecase';
import { PendingTransferService } from './usecase/pending-transfer.service';
import { AccountQueryUseCase } from './usecase/account-query.usecase';

@Module({
  imports: [ProviderModule],
  providers: [ConfirmationUseCase, TransferUseCase, PendingTransferService, AccountQueryUseCase],
  exports: [ConfirmationUseCase, TransferUseCase, PendingTransferService, AccountQueryUseCase]
})
export class CoreModule {}
