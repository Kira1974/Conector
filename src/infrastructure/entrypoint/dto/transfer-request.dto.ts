import { IsNotEmpty, IsNumber, IsString, ValidateNested, IsOptional, Min, IsIn, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export type CurrencyCode = 'COP' | 'USD' | 'EUR';

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

export class TransactionDto {
  @ValidateNested()
  @Type(() => AmountDto)
  @IsNotEmpty()
  amount: AmountDto;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class IdentificationDto {
  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;
}

export class PayeeAccountInfoDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  number?: string;
}

export class PayeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  personType?: string;

  @ValidateNested()
  @Type(() => IdentificationDto)
  @IsOptional()
  identification?: IdentificationDto;

  @ValidateNested()
  @Type(() => PayeeAccountInfoDto)
  @IsNotEmpty()
  accountInfo: PayeeAccountInfoDto;
}

export class TransactionPartiesDto {
  @ValidateNested()
  @Type(() => PayeeDto)
  @IsNotEmpty()
  payee: PayeeDto;
}

export class AdditionalDataDto {
  [key: string]: any;
}

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
