export interface TransferCompletionData {
    endToEndId: string;
    paymentId?: string;
    completedAt?: Date;
    metadata?: Record<string, any>;
    molExecutionId?: string;
}
