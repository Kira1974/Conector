import { TransferResponseCode } from '@infrastructure/entrypoint/dto';
export interface ConfirmationResponse {
    transactionId: string;
    responseCode: TransferResponseCode;
    message: string;
    externalTransactionId: string;
    additionalData: Record<string, string>;
    networkMessage?: string;
    networkCode?: string;
}
