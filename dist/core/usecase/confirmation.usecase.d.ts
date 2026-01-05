import { ThLoggerService } from 'themis';
import { ConfirmationResponse } from '@core/model';
import { TransferConfirmationDto } from '@infrastructure/entrypoint/dto/transfer-confirmation.dto';
import { PendingTransferService } from './pending-transfer.service';
export declare class ConfirmationUseCase {
    private readonly pendingTransferService;
    private readonly loggerService;
    private readonly logger;
    constructor(pendingTransferService: PendingTransferService, loggerService: ThLoggerService);
    processConfirmation(notification: TransferConfirmationDto): ConfirmationResponse;
    private mapSettlementStatusToFinalState;
    private buildSuccessResponse;
    private buildErrorResponse;
    private buildNotFoundResponse;
}
