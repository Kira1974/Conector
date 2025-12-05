import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { TransferFinalState } from '@core/constant';
import { AdditionalDataKey, ConfirmationResponse } from '@core/model';
import { TransferConfirmationDto } from '@infrastructure/entrypoint/dto/transfer-confirmation.dto';

import { PendingTransferService } from './pending-transfer.service';

@Injectable()
export class ConfirmationUseCase {
  private readonly logger: ThLogger;

  constructor(
    private readonly pendingTransferService: PendingTransferService,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(ConfirmationUseCase.name, ThLoggerComponent.APPLICATION);
  }

  processConfirmation(notification: TransferConfirmationDto): ConfirmationResponse {
    const endToEndId = notification.payload.payload.end_to_end_id;
    const executionId = notification.payload.payload.execution_id;
    const settlementStatus = notification.payload.payload.status;

    this.logger.log('Processing transfer confirmation', {
      notificationId: notification.id,
      source: notification.source,
      endToEndId,
      executionId,
      settlementStatus,
      eventName: notification.payload.event_name,
      traceId: notification.payload.properties.trace_id
    });

    const finalState = this.mapSettlementStatusToFinalState(settlementStatus);

    let confirmationResponse: ConfirmationResponse;

    if (!finalState) {
      this.logger.warn('Unknown settlement status received', {
        endToEndId,
        settlementStatus,
        notificationId: notification.id
      });

      confirmationResponse = this.buildErrorResponse(notification);
      this.pendingTransferService.resolveConfirmation(endToEndId, confirmationResponse);
      return confirmationResponse;
    }

    confirmationResponse = this.buildSuccessResponse(endToEndId, executionId, finalState);
    const resolved = this.pendingTransferService.resolveConfirmation(endToEndId, confirmationResponse);

    if (!resolved) {
      this.logger.warn('Confirmation for unknown or expired transfer', {
        endToEndId,
        finalState,
        settlementStatus,
        notificationId: notification.id
      });

      return this.buildNotFoundResponse(endToEndId, executionId);
    }

    this.logger.log('Transfer confirmation processed successfully', {
      endToEndId,
      executionId,
      finalState,
      notificationId: notification.id
    });

    return confirmationResponse;
  }

  private mapSettlementStatusToFinalState(status: string): TransferFinalState | null {
    const statusUpper = status.toUpperCase();

    switch (statusUpper) {
      case 'SUCCESS':
      case 'SETTLED':
        return TransferFinalState.APPROVED;
      case 'REJECTED':
        return TransferFinalState.DECLINED;
      default:
        return null;
    }
  }

  private buildSuccessResponse(
    endToEndId: string,
    executionId: string,
    finalState: TransferFinalState
  ): ConfirmationResponse {
    return {
      transactionId: endToEndId,
      responseCode: finalState,
      message: finalState === TransferFinalState.APPROVED ? 'Payment approved' : 'Payment declined',
      externalTransactionId: endToEndId,
      additionalData: {
        [AdditionalDataKey.END_TO_END]: endToEndId,
        [AdditionalDataKey.EXECUTION_ID]: executionId
      }
    };
  }

  private buildErrorResponse(notification: TransferConfirmationDto): ConfirmationResponse {
    const endToEndId = notification.payload.payload.end_to_end_id;
    const executionId = notification.payload.payload.execution_id;
    const errors = notification.payload.payload.errors;

    let errorMessage = 'Unknown settlement status';
    if (errors && errors.length > 0) {
      errorMessage = errors.map((err) => `${err.code}: ${err.description}`).join(', ');
    }

    return {
      transactionId: endToEndId,
      responseCode: TransferFinalState.ERROR,
      message: errorMessage,
      externalTransactionId: endToEndId,
      additionalData: {
        [AdditionalDataKey.END_TO_END]: endToEndId,
        [AdditionalDataKey.EXECUTION_ID]: executionId
      }
    };
  }

  private buildNotFoundResponse(endToEndId: string, executionId: string): ConfirmationResponse {
    return {
      transactionId: endToEndId,
      responseCode: TransferFinalState.PENDING,
      message: 'Payment pending',
      externalTransactionId: endToEndId,
      additionalData: {
        [AdditionalDataKey.END_TO_END]: endToEndId,
        [AdditionalDataKey.EXECUTION_ID]: executionId
      }
    };
  }
}
