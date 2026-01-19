import { ApiProperty } from '@nestjs/swagger';

export class KeyResolutionResponseDto {
  @ApiProperty({ description: 'Document number', example: '1234567890' })
  documentNumber?: string;

  @ApiProperty({ description: 'Document type', example: 'CC' })
  documentType?: string;

  @ApiProperty({ description: 'Obfuscated name', example: 'Mig*** Her***' })
  personName?: string;

  @ApiProperty({ description: 'Person type', example: 'N' })
  personType?: string;

  @ApiProperty({ description: 'Financial entity NIT', example: '900123456' })
  financialEntityNit?: string;

  @ApiProperty({ description: 'Account type', example: 'CAHO' })
  accountType?: string;

  @ApiProperty({ description: 'Obfuscated account number', example: '***334455' })
  accountNumber?: string;

  @ApiProperty({ description: 'The queried key', example: '@COLOMBIA' })
  key: string;

  @ApiProperty({ description: 'Key type', example: 'O' })
  keyType: string;

  @ApiProperty({ description: 'Response code', example: 'SUCCESS', enum: ['SUCCESS', 'ERROR', 'VALIDATION_FAILED'] })
  responseCode: string;

  //Errors
  @ApiProperty({ description: 'Custom error message', required: false })
  message?: string;

  @ApiProperty({ description: 'Network error code', required: false, example: 'DIFE-0001' })
  networkCode?: string;

  @ApiProperty({
    description: 'Network error message',
    required: false,
    example: 'DIFE: The key does not exist or is canceled'
  })
  networkMessage?: string;
}

export interface KeyResolutionResult {
  response: KeyResolutionResponseDto;
  correlationId: string;
  difeExecutionId?: string;
}
