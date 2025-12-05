/**
 * Transfer Completion Data Model
 * Represents the data needed to mark a transfer as completed
 */

export interface TransferCompletionData {
  /** End-to-end transaction identifier from payment system */
  endToEndId: string;

  /** Payment provider transaction ID */
  paymentId?: string;

  /** Timestamp when completion was recorded */
  completedAt?: Date;

  /** Additional completion metadata */
  metadata?: Record<string, any>;

  /** MOL execution ID */
  molExecutionId?: string;
}
