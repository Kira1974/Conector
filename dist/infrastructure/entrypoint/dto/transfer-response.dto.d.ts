import { TransferMessage } from '@core/constant';
export declare enum TransferResponseCode {
    APPROVED = "APPROVED",
    SUCCESSFUL = "SUCCESSFUL",
    PENDING = "PENDING",
    REJECTED_BY_PROVIDER = "REJECTED_BY_PROVIDER",
    VALIDATION_FAILED = "VALIDATION_FAILED",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    ERROR = "ERROR"
}
export declare class TransferResponseDto {
    transactionId: string;
    responseCode: TransferResponseCode;
    message: TransferMessage;
    networkMessage?: string;
    networkCode?: string;
    externalTransactionId?: string;
    additionalData?: Record<string, any>;
}
