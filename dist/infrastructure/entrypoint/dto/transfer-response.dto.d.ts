import { TransferMessage } from '@core/constant';
export declare enum TransferResponseCode {
    APPROVED = "APPROVED",
    PENDING = "PENDING",
    REJECTED_BY_PROVIDER = "REJECTED_BY_PROVIDER",
    VALIDATION_FAILED = "VALIDATION_FAILED",
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
