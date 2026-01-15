import { ThLoggerService } from 'themis';
import { IDifeProvider, IMolPaymentProvider } from '../provider';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { PendingTransferService } from './pending-transfer.service';
export declare class TransferUseCase {
    private readonly difeProvider;
    private readonly paymentProvider;
    private readonly pendingTransferService;
    private readonly loggerService;
    private readonly logger;
    private static readonly TRANSFER_TIMEOUT_SECONDS;
    constructor(difeProvider: IDifeProvider, paymentProvider: IMolPaymentProvider, pendingTransferService: PendingTransferService, loggerService: ThLoggerService);
    executeTransfer(request: TransferRequestDto): Promise<TransferResponseDto>;
    private extractKeyResolutionFromAdditionalData;
    private parsePayeeName;
    private isKeyResolutionComplete;
    private buildLogContext;
    private buildKeyResolutionRequest;
    private validatePaymentResponse;
    private waitForFinalState;
    private handleTransferError;
}
