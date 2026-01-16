import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import {
  KeyTypeDife,
  PaymentMethodTypeDife,
  IdentificationTypeDife,
  PersonTypeDife,
  TransferMessage
} from '@core/constant';

import { IDifeProvider, IMolPaymentProvider } from '../provider';
import { AdditionalDataKey, KeyResolutionRequest } from '../model';
import {
  generateCorrelationId,
  calculateKeyType,
  validateKeyFormatBeforeResolution,
  buildDifeErrorResponseIfAny,
  extractNetworkErrorInfo,
  buildAdditionalDataFromKeyResolution,
  determineResponseCodeFromMessage
} from '../util';
import { ErrorMessageMapper } from '../util/error-message.mapper';
import { UNKNOWN_ERROR_MESSAGE, DEFAULT_TIMEOUT_MESSAGE } from '../util/error-constants.util';
import { KeyResolutionException } from '../exception/custom.exceptions';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';

import { PendingTransferService } from './pending-transfer.service';

@Injectable()
export class TransferUseCase {
  private readonly logger: ThLogger;
  private static readonly TRANSFER_TIMEOUT_SECONDS = 50;

  constructor(
    private readonly difeProvider: IDifeProvider,
    private readonly paymentProvider: IMolPaymentProvider,
    private readonly pendingTransferService: PendingTransferService,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(TransferUseCase.name, ThLoggerComponent.APPLICATION);
  }

  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('transfer').setAction('execute'),
    tags: ['transfer', 'execution']
  })
  async executeTransfer(request: TransferRequestDto): Promise<TransferResponseDto> {
    const startedAt = Date.now();

    try {
      const keyValidation = validateKeyFormatBeforeResolution(request);
      if (keyValidation) {
        return keyValidation;
      }

      let keyResolution: DifeKeyResponseDto;
      let keyResolutionSource: 'FROM_REQUEST' | 'FROM_DIFE';

      const keyResolutionFromRequest = this.extractKeyResolutionFromAdditionalData(request);

      if (this.isKeyResolutionComplete(keyResolutionFromRequest)) {
        this.logger.log('Using keyResolution from request additionalData, skipping DIFE call', {
          transactionId: request.transaction.id,
          correlationId: request.transaction.id
        });
        keyResolution = keyResolutionFromRequest;
        keyResolutionSource = 'FROM_REQUEST';
      } else {
        this.logger.log('keyResolution not provided or incomplete in additionalData, calling DIFE', {
          transactionId: request.transaction.id,
          correlationId: request.transaction.id,
          hasPartialData: !!keyResolutionFromRequest
        });
        const keyResolutionRequest = this.buildKeyResolutionRequest(request);
        keyResolution = await this.difeProvider.resolveKey(keyResolutionRequest);
        keyResolutionSource = 'FROM_DIFE';
      }

      const difeAdditionalData = buildAdditionalDataFromKeyResolution(keyResolution);

      const difeErrorResponse = buildDifeErrorResponseIfAny(request, keyResolution);
      if (difeErrorResponse) {
        return difeErrorResponse;
      }

      const paymentResponse = await this.paymentProvider.createPayment(request, keyResolution);

      paymentResponse.additionalData = {
        ...(paymentResponse.additionalData || {}),
        ...difeAdditionalData,
        KEY_RESOLUTION_SOURCE: keyResolutionSource
      };

      const paymentValidation = this.validatePaymentResponse(request, paymentResponse);
      if (paymentValidation.errorResponse) {
        return paymentValidation.errorResponse;
      }

      return this.waitForFinalState(request, paymentResponse, paymentValidation.endToEndId, startedAt);
    } catch (error: unknown) {
      return this.handleTransferError(error, request.transaction.id);
    }
  }

  private extractKeyResolutionFromAdditionalData(request: TransferRequestDto): DifeKeyResponseDto | null {
    const accountDetail = request.transaction.payee.account.detail;

    if (!accountDetail) {
      return null;
    }

    const keyValue = accountDetail['KEY_VALUE'] as string | undefined;
    const keyType = accountDetail['KEY_TYPE'] as string | undefined;
    const participantNit = accountDetail['PARTICIPANT_NIT'] as string | undefined;
    const participantSpbvi = accountDetail['PARTICIPANT_SPBVI'] as string | undefined;
    const difeTraceId = accountDetail['DIFE_TRACE_ID'] as string | undefined;

    if (!keyValue || !keyType || !participantNit || !participantSpbvi) {
      return null;
    }

    const accountType = request.transaction.payee.account.type;
    const accountNumber = request.transaction.payee.account.number;
    const documentType = request.transaction.payee.documentType;
    const documentNumber = request.transaction.payee.documentNumber;
    const payeeName = request.transaction.payee.name;
    const personType = request.transaction.payee.personType;

    if (!accountType || !accountNumber) {
      return null;
    }

    const additionalData = request.transaction.additionalData || {};
    const difeExecutionId = additionalData['BREB_DIFE_END_TO_END_ID'] as string | undefined;
    const names = this.parsePayeeName(payeeName);

    const correlationId = generateCorrelationId();

    return {
      correlation_id: correlationId,
      execution_id: difeExecutionId,
      trace_id: difeTraceId || '',
      status: 'SUCCESS',
      key: {
        key: {
          type: keyType as KeyTypeDife,
          value: keyValue
        },
        participant: {
          nit: participantNit,
          spbvi: participantSpbvi
        },
        payment_method: {
          type: accountType as PaymentMethodTypeDife,
          number: accountNumber
        },
        person: {
          type: (personType || 'N') as PersonTypeDife,
          identification: {
            type: (documentType || 'CC') as IdentificationTypeDife,
            number: documentNumber || ''
          },
          name: names.firstName
            ? {
                first_name: names.firstName,
                second_name: names.secondName || '',
                last_name: names.lastName || '',
                second_last_name: names.secondLastName || ''
              }
            : undefined,
          legal_name: names.legalName
        }
      }
    };
  }

  private parsePayeeName(payeeName?: string): {
    firstName?: string;
    secondName?: string;
    lastName?: string;
    secondLastName?: string;
    legalName?: string;
  } {
    if (!payeeName || payeeName.trim() === '') {
      return {};
    }

    const parts = payeeName.trim().split(/\s+/);

    if (parts.length === 1) {
      return { legalName: parts[0] };
    }

    if (parts.length === 2) {
      return { firstName: parts[0], lastName: parts[1] };
    }

    if (parts.length === 3) {
      return { firstName: parts[0], lastName: parts[1], secondLastName: parts[2] };
    }

    if (parts.length >= 4) {
      return {
        firstName: parts[0],
        secondName: parts[1],
        lastName: parts[2],
        secondLastName: parts[3]
      };
    }

    return {};
  }

  private isKeyResolutionComplete(keyResolution: DifeKeyResponseDto | null): keyResolution is DifeKeyResponseDto {
    if (!keyResolution?.key) {
      return false;
    }

    const key = keyResolution.key;

    return !!(
      keyResolution.status === 'SUCCESS' &&
      keyResolution.correlation_id &&
      key.key?.type &&
      key.key?.value &&
      key.participant?.nit &&
      key.participant?.spbvi &&
      key.payment_method?.type &&
      key.payment_method?.number
    );
  }

  private buildLogContext(transactionId: string): { correlationId: string; transactionId: string } {
    return {
      correlationId: transactionId,
      transactionId
    };
  }

  private buildKeyResolutionRequest(request: TransferRequestDto): KeyResolutionRequest {
    const correlationId = generateCorrelationId();
    const keyValue = request.transaction.payee.account.detail?.['KEY_VALUE'] as string | undefined;
    const key = keyValue || '';
    const keyType = calculateKeyType(key);

    return {
      correlationId,
      key,
      keyType,
      transactionId: request.transaction.id
    };
  }

  private validatePaymentResponse(
    request: TransferRequestDto,
    paymentResponse: TransferResponseDto
  ):
    | { endToEndId: string; errorResponse?: undefined }
    | { endToEndId?: undefined; errorResponse: TransferResponseDto } {
    if (paymentResponse.responseCode === TransferResponseCode.ERROR) {
      return { errorResponse: paymentResponse };
    }

    const additionalData = paymentResponse.additionalData as Record<string, string> | undefined;
    const endToEndId = additionalData?.[AdditionalDataKey.END_TO_END];

    if (!endToEndId || endToEndId.trim() === '') {
      this.logger.error('Missing END_TO_END in payment response', {
        ...this.buildLogContext(request.transaction.id)
      });
      return {
        errorResponse: {
          transactionId: request.transaction.id,
          responseCode: TransferResponseCode.ERROR,
          message: TransferMessage.PAYMENT_PROCESSING_ERROR
        }
      };
    }

    return { endToEndId };
  }

  private async waitForFinalState(
    request: TransferRequestDto,
    paymentResponse: TransferResponseDto,
    endToEndId: string,
    startedAt: number
  ): Promise<TransferResponseDto> {
    this.logger.log('Waiting for transfer confirmation', {
      eventId: request.transaction.id,
      traceId: request.transaction.id,
      correlationId: endToEndId,
      transactionId: request.transaction.id,
      endToEndId,
      timeoutSeconds: TransferUseCase.TRANSFER_TIMEOUT_SECONDS
    });

    try {
      const confirmationResponse = await this.pendingTransferService.waitForConfirmation(
        request.transaction.id,
        endToEndId,
        startedAt
      );

      const isApproved = confirmationResponse.responseCode === TransferResponseCode.APPROVED;

      return {
        transactionId: request.transaction.id,
        responseCode: confirmationResponse.responseCode,
        message: isApproved ? TransferMessage.PAYMENT_APPROVED : TransferMessage.PAYMENT_DECLINED,
        networkMessage: confirmationResponse.networkMessage,
        networkCode: confirmationResponse.networkCode,
        externalTransactionId: paymentResponse.externalTransactionId,
        additionalData: paymentResponse.additionalData
      };
    } catch (timeoutError) {
      const timeoutMessage = timeoutError instanceof Error ? timeoutError.message : DEFAULT_TIMEOUT_MESSAGE;

      this.logger.warn('Transfer confirmation timeout (controlled)', {
        eventId: request.transaction.id,
        traceId: request.transaction.id,
        correlationId: endToEndId,
        transactionId: request.transaction.id,
        endToEndId,
        error: timeoutMessage
      });

      return {
        transactionId: request.transaction.id,
        responseCode: TransferResponseCode.PENDING,
        message: TransferMessage.PAYMENT_PENDING,
        networkMessage: undefined,
        networkCode: undefined,
        externalTransactionId: paymentResponse.externalTransactionId,
        additionalData: paymentResponse.additionalData
      };
    }
  }

  private handleTransferError(error: unknown, transactionId: string): TransferResponseDto {
    const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;

    this.logger.error('Transfer execution failed', error, {
      correlationId: transactionId,
      transactionId
    });

    if (error instanceof KeyResolutionException) {
      const networkErrorInfo = extractNetworkErrorInfo(error.message);
      const errorInfo = networkErrorInfo
        ? { code: networkErrorInfo.code, description: error.message, source: networkErrorInfo.source }
        : { code: undefined, description: error.message, source: 'DIFE' as const };

      const mappedMessage = ErrorMessageMapper.mapToMessage(errorInfo);
      const responseCode = determineResponseCodeFromMessage(mappedMessage, true, errorInfo);

      return {
        transactionId,
        responseCode,
        message: mappedMessage,
        networkMessage: error.message,
        ...(errorInfo.code && { networkCode: errorInfo.code })
      };
    }

    const errorInfo = extractNetworkErrorInfo(errorMessage);
    const networkErrorInfo = errorInfo
      ? { code: errorInfo.code, description: errorMessage, source: errorInfo.source }
      : null;
    const mappedMessage = networkErrorInfo
      ? ErrorMessageMapper.mapToMessage(networkErrorInfo)
      : TransferMessage.UNKNOWN_ERROR;
    const fromProvider = !!errorInfo;
    const responseCode = determineResponseCodeFromMessage(mappedMessage, fromProvider, networkErrorInfo);

    return {
      transactionId,
      responseCode,
      message: mappedMessage,
      networkMessage: errorMessage,
      ...(errorInfo?.code && { networkCode: errorInfo.code })
    };
  }
}
