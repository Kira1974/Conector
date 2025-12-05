export interface MolPaymentRequestDto {
  internal_id: string;
  value: number;
  currency?: string;
  description?: string;
  additionalData?: Record<string, any>;
  correlationId?: string;
}
