import { TransferMessage } from '@core/constant';

export enum TransferResponseCode {
  APPROVED = 'APPROVED',
  SUCCESSFUL = 'SUCCESSFUL',
  PENDING = 'PENDING',
  REJECTED_BY_PROVIDER = 'REJECTED_BY_PROVIDER',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  ERROR = 'ERROR'
}

export class TransferResponseDto {
  transactionId: string;
  responseCode: TransferResponseCode;
  message: TransferMessage;
  networkMessage?: string;
  networkCode?: string;
  externalTransactionId?: string;
  additionalData?: Record<string, any>;
}
