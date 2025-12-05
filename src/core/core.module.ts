import { Module } from '@nestjs/common';

import { ProviderModule } from '../infrastructure/provider/provider.module';

import { ConfirmationUseCase } from './usecase/confirmation.usecase';
import { TransferUseCase } from './usecase/transfer.usecase';
import { PendingTransferService } from './usecase/pending-transfer.service';

@Module({
  imports: [ProviderModule],
  providers: [ConfirmationUseCase, TransferUseCase, PendingTransferService],
  exports: [ConfirmationUseCase, TransferUseCase, PendingTransferService]
})
export class CoreModule {}
