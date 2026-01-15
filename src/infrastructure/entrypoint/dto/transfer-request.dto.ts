import { IsNotEmpty, IsNumber, IsString, ValidateNested, IsOptional, Min, IsIn, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export type CurrencyCode = 'COP' | 'USD' | 'EUR';

export class AmountDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  total: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['COP', 'USD', 'EUR'])
  currency: CurrencyCode;
}

export class PayerAccountDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  number: string;
}

export class PayerDto {
  @ValidateNested()
  @Type(() => PayerAccountDto)
  @IsNotEmpty()
  account: PayerAccountDto;
}

export class PayeeAccountDetailDto {
  [key: string]: any;
}

export class PayeeAccountDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  number?: string;

  @IsObject()
  @IsOptional()
  detail?: PayeeAccountDetailDto;
}

export class PayeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  personType?: string;

  @IsString()
  @IsOptional()
  documentType?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ValidateNested()
  @Type(() => PayeeAccountDto)
  @IsNotEmpty()
  account: PayeeAccountDto;
}

export class AdditionalDataDto {
  [key: string]: any;
}

export class TransactionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @ValidateNested()
  @Type(() => AmountDto)
  @IsNotEmpty()
  amount: AmountDto;

  @IsString()
  @IsNotEmpty()
  description: string;

  @ValidateNested()
  @Type(() => PayerDto)
  @IsOptional()
  payer?: PayerDto;

  @ValidateNested()
  @Type(() => PayeeDto)
  @IsNotEmpty()
  payee: PayeeDto;

  @IsObject()
  @IsOptional()
  additionalData?: AdditionalDataDto;
}

export class TransferRequestDto {
  @ValidateNested()
  @Type(() => TransactionDto)
  @IsNotEmpty()
  transaction: TransactionDto;
}
