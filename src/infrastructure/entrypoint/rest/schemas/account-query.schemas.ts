import { ApiProperty } from '@nestjs/swagger';

export class AccountSchema {
  @ApiProperty({
    description: 'Account type - BREB for Bre-B key resolution',
    example: 'BREB',
    enum: ['BREB']
  })
  type: string;

  @ApiProperty({
    description: 'The key value to resolve (mobile, email, alphanumeric, etc.)',
    example: '3001234567'
  })
  value: string;
}

export class AccountQueryRequestSchema {
  @ApiProperty({
    description: 'Account information containing the key to resolve',
    type: AccountSchema
  })
  account: AccountSchema;
}

// Response Data Schemas
export class AccountDetailSchema {
  @ApiProperty({ description: 'Key value', example: '3001234567' })
  KEY_VALUE: string;

  @ApiProperty({ description: 'DIFE correlation ID', example: '800227747ca675da18c35c11528d44c9f2aa22cf6a410' })
  BREB_DIFE_CORRELATION_ID: string;

  @ApiProperty({ description: 'DIFE trace ID', example: '212121' })
  BREB_DIFE_TRACE_ID: string;

  @ApiProperty({
    description: 'DIFE execution ID',
    example: '800227747ca675da18c35c11528d44c9f2aa22cf6a410',
    required: false
  })
  BREB_DIFE_EXECUTION_ID?: string;

  @ApiProperty({ description: 'Key type', example: 'M', enum: ['M', 'E', 'O', 'B', 'NRIC'] })
  BREB_KEY_TYPE: string;

  @ApiProperty({ description: 'Participant NIT', example: '900123456' })
  BREB_PARTICIPANT_NIT: string;

  @ApiProperty({ description: 'Participant SPBVI code', example: 'CRED' })
  BREB_PARTICIPANT_SPBVI: string;
}

export class AccountInfoSchema {
  @ApiProperty({ description: 'Account type', example: 'CAHO', enum: ['CAHO', 'CAAH'] })
  type: string;

  @ApiProperty({ description: 'Account number (not obfuscated)', example: '123123123123' })
  number: string;

  @ApiProperty({ description: 'Additional account details', type: AccountDetailSchema })
  detail: AccountDetailSchema;
}

export class UserDataSchema {
  @ApiProperty({ description: 'Person full name (not obfuscated)', example: 'Juan Carlos Perez Gomez' })
  name: string;

  @ApiProperty({ description: 'Person type', example: 'N', enum: ['N', 'J'] })
  personType: string;

  @ApiProperty({ description: 'Document type', example: 'CC' })
  documentType: string;

  @ApiProperty({ description: 'Document number', example: '1234567890' })
  documentNumber: string;

  @ApiProperty({ description: 'Account information', type: AccountInfoSchema })
  account: AccountInfoSchema;
}

export class AccountQuerySuccessDataSchema {
  @ApiProperty({ description: 'External transaction ID from DIFE', example: 'dife-execution-id' })
  externalTransactionId: string;

  @ApiProperty({
    description: 'Transaction state',
    example: 'SUCCESFUL',
    enum: ['SUCCESFUL', 'VALIDATION_FAILED', 'REJECTED_BY_PROVIDER', 'PROVIDER_ERROR', 'ERROR']
  })
  state: string;

  @ApiProperty({ description: 'User data with account information', type: UserDataSchema })
  userData: UserDataSchema;
}

export class AccountQueryErrorDataSchema {
  @ApiProperty({ description: 'Network error code', example: 'DIFE-4000', required: false })
  networkCode?: string;

  @ApiProperty({
    description: 'Network error message',
    example: 'DIFE: Invalid key format (DIFE-4000)',
    required: false
  })
  networkMessage?: string;
}

export class AccountQuerySuccessResponseSchema {
  @ApiProperty({ description: 'Response code (numeric)', example: 201, type: 'number' })
  code: number;

  @ApiProperty({ description: 'Response message', example: 'Key resolved successfully' })
  message: string;

  @ApiProperty({ description: 'Response data', type: AccountQuerySuccessDataSchema })
  data: AccountQuerySuccessDataSchema;
}

export class AccountQueryErrorResponseSchema {
  @ApiProperty({ description: 'Response code (numeric)', example: 400, type: 'number' })
  code: number;

  @ApiProperty({ description: 'Response message', example: 'Invalid key format' })
  message: string;

  @ApiProperty({ description: 'Error data with network information', type: AccountQueryErrorDataSchema })
  data: AccountQueryErrorDataSchema;
}
