import { TransferFinalState } from '../constant';

export interface ConfirmationResponse {
  transactionId: string;
  responseCode: TransferFinalState;
  message: string;
  externalTransactionId: string;
  additionalData: Record<string, string>;
}
