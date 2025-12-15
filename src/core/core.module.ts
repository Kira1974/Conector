import { Module } from '@nestjs/common';

import { ProviderModule } from '../infrastructure/provider/provider.module';

import { ConfirmationUseCase } from './usecase/confirmation.usecase';
import { TransferUseCase } from './usecase/transfer.usecase';
import { PendingTransferService } from './usecase/pending-transfer.service';
import { KeyResolutionUseCase } from './usecase/key-resolution.usecase';

@Module({
  imports: [ProviderModule],
  providers: [ConfirmationUseCase, TransferUseCase, PendingTransferService, KeyResolutionUseCase],
  exports: [ConfirmationUseCase, TransferUseCase, PendingTransferService, KeyResolutionUseCase]
})
export class CoreModule {}
