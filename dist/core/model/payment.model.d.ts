export interface PaymentRequest {
    internalId: string;
    value: number;
    currency?: string;
    description?: string;
    additionalData?: Record<string, any>;
    correlationId?: string;
    transactionId?: string;
}
