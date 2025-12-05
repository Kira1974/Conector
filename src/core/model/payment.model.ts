/**
 * Domain models for payment operations
 * Core layer should only know about these, not infrastructure DTOs
 */

export interface PaymentRequest {
  internalId: string;
  value: number;
  currency?: string;
  description?: string;
  additionalData?: Record<string, any>;
  correlationId?: string;
  transactionId?: string;
}
