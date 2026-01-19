import { IsNotEmpty, IsNumber, IsString, ValidateNested, IsOptional, Min, IsIn, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export type CurrencyCode = 'COP' | 'USD' | 'EUR';

/**
 * Amount details for transfer
 */
export class AmountDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  value: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['COP', 'USD', 'EUR'])
  currency: CurrencyCode;
}

/**
 * Transaction details for transfer
 */
export class TransactionDto {
  @ValidateNested()
  @Type(() => AmountDto)
  @IsNotEmpty()
  amount: AmountDto;

  @IsString()
  @IsNotEmpty()
  description: string;
}

/**
 * Payee account information for transfer
 */
export class PayeeAccountInfoDto {
  @IsString()
  @IsNotEmpty()
  value: string;
}

/**
 * Payee details for transfer
 */
export class PayeeDto {
  @ValidateNested()
  @Type(() => PayeeAccountInfoDto)
  @IsNotEmpty()
  accountInfo: PayeeAccountInfoDto;
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  documentNumber?: string;
}

/**
 * Transaction parties for transfer
 */
export class TransactionPartiesDto {
  @ValidateNested()
  @Type(() => PayeeDto)
  @IsNotEmpty()
  payee: PayeeDto;
}

/**
 * Additional data for transfer
 */
export class AdditionalDataDto {
  [key: string]: any;
}

/**
 * Transfer Request DTO
 * Main request for creating a transfer using DIFE + MOL
 */
export class TransferRequestDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ValidateNested()
  @Type(() => TransactionDto)
  @IsNotEmpty()
  transaction: TransactionDto;

  @ValidateNested()
  @Type(() => TransactionPartiesDto)
  @IsNotEmpty()
  transactionParties: TransactionPartiesDto;

  @IsObject()
  @IsOptional()
  additionalData?: AdditionalDataDto;
}
