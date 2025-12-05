export enum TransferResponseCode {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED_BY_PROVIDER = 'REJECTED_BY_PROVIDER',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ERROR = 'ERROR'
}

export class TransferResponseDto {
  transactionId: string;
  responseCode: TransferResponseCode;
  message: string;
  externalTransactionId?: string;
  additionalData?: Record<string, any>;
}
