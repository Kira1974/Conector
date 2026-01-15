export enum TransferMessage {
  // Success messages
  PAYMENT_APPROVED = 'Payment approved successfully',
  PAYMENT_PENDING = 'Payment is pending confirmation',
  PAYMENT_INITIATED = 'Payment initiated successfully',
  TRANSFER_COMPLETED = 'Transfer completed successfully',
  KEY_RESOLUTION_SUCCESS = 'Key resolved successfully',

  // Rejection messages
  PAYMENT_REJECTED = 'Payment was rejected by provider',
  PAYMENT_DECLINED = 'Payment was declined',
  TRANSACTION_REJECTED = 'The transaction was rejected by provider',

  // Validation error messages
  VALIDATION_FAILED = 'Validation failed',
  VALIDATION_ERROR = 'Validation error occurred',
  INVALID_KEY_FORMAT = 'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
  INVALID_ACCOUNT_NUMBER = 'Invalid account number',
  DOCUMENT_MISMATCH = 'Payee document number does not match with key resolution',
  ACCOUNT_MISMATCH = 'Payee account number does not match with key resolution',

  // Key resolution messages
  KEY_RESOLUTION_ERROR = 'Key resolution failed',
  KEY_NOT_FOUND_OR_CANCELED = 'The key does not exist or is canceled.',
  KEY_SUSPENDED = 'The key is suspended by the client.',
  KEY_SUSPENDED_BY_PARTICIPANT = 'The key is suspended by the participant.',
  KEY_RESOLUTION_NETWORK_ERROR = 'Unknown error in key resolution network',

  // Provider and network error messages
  PROVIDER_ERROR = 'Uncontrolled error occurred in the external system',
  PAYMENT_PROCESSING_ERROR = 'Payment processing failed',
  PAYMENT_NETWORK_ERROR = 'Unknown error in payment network',
  NETWORK_ERROR = 'Network error occurred',
  TIMEOUT_ERROR = 'Request timeout',
  UNKNOWN_ERROR = 'Unknown error occurred'
}
