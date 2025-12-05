import { IsString, IsOptional, IsDateString, ValidateIf } from 'class-validator';

export class MolPaymentQueryRequestDto {
  @IsOptional()
  @IsDateString()
  @ValidateIf((o: MolPaymentQueryRequestDto) => o.created_at_end !== undefined)
  readonly created_at_start?: string;

  @IsOptional()
  @IsDateString()
  @ValidateIf((o: MolPaymentQueryRequestDto) => o.created_at_start !== undefined)
  readonly created_at_end?: string;

  @IsOptional()
  @IsString()
  readonly end_to_end_id?: string;

  @IsOptional()
  @IsString()
  readonly internal_id?: string;

  static byInternalId(internalId: string): MolPaymentQueryRequestDto {
    const dto = new MolPaymentQueryRequestDto();
    return Object.assign(dto, { internal_id: internalId });
  }

  static byEndToEndId(endToEndId: string): MolPaymentQueryRequestDto {
    const dto = new MolPaymentQueryRequestDto();
    return Object.assign(dto, { end_to_end_id: endToEndId });
  }

  static byDateRange(startDate: string, endDate: string): MolPaymentQueryRequestDto {
    const dto = new MolPaymentQueryRequestDto();
    return Object.assign(dto, {
      created_at_start: startDate,
      created_at_end: endDate
    });
  }
}

export interface MolPaymentParticipant {
  identification: {
    type: string;
    value: string;
  };
  name: string;
  participant: {
    id: string;
    nit: string;
    spbvi: string;
  };
  payment_method: {
    currency: string;
    type: string;
    value: string;
  };
}

export interface MolPaymentQueryItem {
  billing_responsible: string;
  context: string;
  created_at: string;
  creditor: MolPaymentParticipant;
  end_to_end_id: string;
  internal_id: string;
  payer: MolPaymentParticipant;
  qr_code_id: string;
  status: string;
  time_mark: Record<string, string>;
  transaction_amount: string;
}

export interface MolPaymentQueryError {
  code: string;
  description: string;
}

export interface MolPaymentQueryResponseDto {
  errors: MolPaymentQueryError[];
  items: MolPaymentQueryItem[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalResults: number;
  };
  trace_id: string;
}
