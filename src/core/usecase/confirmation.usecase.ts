import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { AdditionalDataKey, ConfirmationResponse } from '@core/model';
import { TransferConfirmationDto } from '@infrastructure/entrypoint/dto/transfer-confirmation.dto';
import { TransferResponseCode } from '@infrastructure/entrypoint/dto';
import { TransferMessage } from '@core/constant';
import { ErrorMessageMapper } from '@core/util/error-message.mapper';
import { determineResponseCodeFromMessage } from '@core/util/transfer-validation.util';

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

  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('transfer').setAction('confirm'),
    tags: ['transfer', 'confirmation']
  })
  processConfirmation(notification: TransferConfirmationDto): ConfirmationResponse {
    const endToEndId = notification.payload.payload.end_to_end_id;
    const executionId = notification.payload.payload.execution_id;
    const settlementStatus = notification.payload.payload.status;
    const transactionId = this.pendingTransferService.getTransactionIdByEndToEndId(endToEndId) || endToEndId;
    const eventId = transactionId;
    const traceId = transactionId;
    const correlationId = endToEndId;

    this.logger.log('NETWORK_REQUEST WEBHOOK', {
      eventId,
      traceId,
      correlationId,
      transactionId,
      endToEndId,
      notificationId: notification.id,
      source: notification.source,
      externalTransactionId: endToEndId,
      executionId,
      settlementStatus,
      eventName: notification.payload.event_name,
      requestBody: JSON.stringify(notification, null, 2)
    });

    const finalState = this.mapSettlementStatusToFinalState(settlementStatus);

    let confirmationResponse: ConfirmationResponse;

    if (!finalState) {
      this.logger.warn('Unknown settlement status received', {
        eventId,
        traceId,
        correlationId,
        transactionId,
        endToEndId,
        settlementStatus,
        notificationId: notification.id
      });

      confirmationResponse = this.buildErrorResponse(notification);
      this.pendingTransferService.resolveConfirmation(endToEndId, confirmationResponse, 'webhook');
      return confirmationResponse;
    }

    if (settlementStatus.toUpperCase() === 'ERROR' && notification.payload.payload.errors) {
      confirmationResponse = this.buildErrorResponse(notification);
    } else {
      confirmationResponse = this.buildSuccessResponse(endToEndId, executionId, finalState);
    }
    const resolved = this.pendingTransferService.resolveConfirmation(endToEndId, confirmationResponse, 'webhook');

    if (!resolved) {
      this.logger.warn('Confirmation for unknown or expired transfer', {
        eventId,
        traceId,
        correlationId,
        transactionId,
        endToEndId,
        finalState,
        settlementStatus,
        notificationId: notification.id
      });

      return this.buildNotFoundResponse(endToEndId, executionId);
    }

    this.logger.log('Transfer confirmation processed successfully', {
      eventId,
      traceId,
      correlationId,
      transactionId,
      endToEndId,
      executionId,
      finalState,
      notificationId: notification.id
    });

    return confirmationResponse;
  }

  private mapSettlementStatusToFinalState(status: string): TransferResponseCode | null {
    const statusUpper = status.toUpperCase();

    switch (statusUpper) {
      case 'SUCCESS':
      case 'SETTLED':
        return TransferResponseCode.APPROVED;
      case 'REJECTED':
      case 'ERROR':
        return TransferResponseCode.REJECTED_BY_PROVIDER;
      default:
        return null;
    }
  }

  private buildSuccessResponse(
    endToEndId: string,
    executionId: string,
    finalState: TransferResponseCode
  ): ConfirmationResponse {
    return {
      transactionId: endToEndId,
      responseCode: finalState,
      message: finalState === TransferResponseCode.APPROVED ? 'Payment approved' : 'Payment declined',
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

    let networkMessage: string | undefined;
    let networkCode: string | undefined;
    let mappedMessage: TransferMessage = TransferMessage.PAYMENT_DECLINED;

    if (errors && errors.length > 0) {
      const firstError = errors[0];
      networkCode = firstError.code;
      networkMessage = firstError.description;

      const errorInfo = {
        code: networkCode,
        description: networkMessage,
        source: 'MOL' as const
      };

      mappedMessage = ErrorMessageMapper.mapToMessage(errorInfo);
      const responseCode = determineResponseCodeFromMessage(mappedMessage);

      return {
        transactionId: endToEndId,
        responseCode,
        message: mappedMessage,
        externalTransactionId: endToEndId,
        networkMessage: ErrorMessageMapper.formatNetworkErrorMessage(networkMessage, 'MOL'),
        networkCode,
        additionalData: {
          [AdditionalDataKey.END_TO_END]: endToEndId,
          [AdditionalDataKey.EXECUTION_ID]: executionId
        }
      };
    }

    return {
      transactionId: endToEndId,
      responseCode: TransferResponseCode.ERROR,
      message: 'Unknown settlement status',
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
      responseCode: TransferResponseCode.PENDING,
      message: 'Payment pending',
      externalTransactionId: endToEndId,
      additionalData: {
        [AdditionalDataKey.END_TO_END]: endToEndId,
        [AdditionalDataKey.EXECUTION_ID]: executionId
      }
    };
  }
}
