import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Error details in settlement result
 */
export class SettlementErrorDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

/**
 * Payload details for Credibanco settlement result
 */
export class SettlementPayloadDto {
  @IsString()
  @IsNotEmpty()
  execution_id: string;

  @IsString()
  @IsNotEmpty()
  end_to_end_id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementErrorDto)
  @IsOptional()
  errors?: SettlementErrorDto[];

  @IsString()
  @IsOptional()
  qr_code_id?: string;

  @IsOptional()
  time_marks?: any;
}

/**
 * Properties for Credibanco settlement result
 */
export class SettlementPropertiesDto {
  @IsString()
  @IsNotEmpty()
  event_date: string;

  @IsString()
  @IsNotEmpty()
  trace_id: string;
}

/**
 * Credibanco Settlement Result
 * Contains the complete settlement event from Credibanco
 */
export class CredibancoSettlementResultDto {
  @IsString()
  @IsNotEmpty()
  event_name: string;

  @IsString()
  @IsNotEmpty()
  event_type: string;

  @ValidateNested()
  @Type(() => SettlementPayloadDto)
  @IsNotEmpty()
  payload: SettlementPayloadDto;

  @ValidateNested()
  @Type(() => SettlementPropertiesDto)
  @IsNotEmpty()
  properties: SettlementPropertiesDto;
}

/**
 * Transfer Confirmation DTO
 * Main request for transfer confirmation notifications from external systems
 */
export class TransferConfirmationDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  source: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @ValidateNested()
  @Type(() => CredibancoSettlementResultDto)
  @IsNotEmpty()
  payload: CredibancoSettlementResultDto;
}
