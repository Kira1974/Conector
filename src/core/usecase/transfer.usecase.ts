import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

import { IDifeProvider, IMolPaymentProvider } from '../provider';
import { AdditionalDataKey, KeyResolutionRequest } from '../model';
import {
  generateCorrelationId,
  calculateKeyType,
  ErrorMessageMapper,
  validateKeyFormatBeforeResolution,
  validatePayeeDocumentNumber,
  validateBrebAccountNumber,
  buildDifeErrorResponseIfAny,
  isDifeValidationError,
  isMolValidationError,
  isMolValidationErrorByCode,
  extractNetworkErrorInfo,
  buildAdditionalDataFromKeyResolution,
  determineResponseCodeFromMessage
} from '../util';
import {
  ERROR_SOURCE_DIFE,
  ERROR_SOURCE_MOL,
  UNKNOWN_ERROR_MESSAGE,
  DEFAULT_TIMEOUT_MESSAGE
} from '../util/error-constants.util';
import { TransferMessage } from '../constant';
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

      const keyResolutionRequest = this.buildKeyResolutionRequest(request);
      const keyResolution: DifeKeyResponseDto = await this.difeProvider.resolveKey(keyResolutionRequest);
      const difeAdditionalData = buildAdditionalDataFromKeyResolution(keyResolution);

      const validationError = this.validateRequest(request, keyResolution);
      if (validationError) {
        return validationError;
      }

      const paymentResponse = await this.paymentProvider.createPayment(request, keyResolution);

      paymentResponse.additionalData = {
        ...(paymentResponse.additionalData || {}),
        ...difeAdditionalData
      };

      const paymentValidation = this.validatePaymentResponse(request, paymentResponse);
      if (paymentValidation.errorResponse) {
        return paymentValidation.errorResponse;
      }

      return this.waitForFinalState(request, paymentResponse, paymentValidation.endToEndId, startedAt);
    } catch (error: unknown) {
      return this.handleTransferError(error, request.transactionId);
    }
  }

  private validateRequest(request: TransferRequestDto, keyResolution: DifeKeyResponseDto): TransferResponseDto | null {
    const difeErrorResponse = buildDifeErrorResponseIfAny(request, keyResolution);
    if (difeErrorResponse) {
      return difeErrorResponse;
    }

    const payeeValidationError = validatePayeeDocumentNumber(request, keyResolution);
    if (payeeValidationError) {
      this.logger.warn('Payee document number validation failed', {
        ...this.buildLogContext(request.transactionId)
      });
      return payeeValidationError;
    }

    const brebAccountValidationError = validateBrebAccountNumber(request, keyResolution);
    if (brebAccountValidationError) {
      this.logger.warn('BREB account number validation failed', {
        ...this.buildLogContext(request.transactionId)
      });
      return brebAccountValidationError;
    }

    return null;
  }

  private buildLogContext(transactionId: string): { correlationId: string; transactionId: string } {
    return {
      correlationId: transactionId,
      transactionId
    };
  }

  private buildKeyResolutionRequest(request: TransferRequestDto): KeyResolutionRequest {
    const correlationId = generateCorrelationId();
    const key = request.transactionParties.payee.accountInfo.value;
    const keyType = calculateKeyType(key);

    return {
      correlationId,
      key,
      keyType,
      transactionId: request.transactionId
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

    if (!endToEndId) {
      this.logger.error('Payment response missing endToEndId', {
        transactionId: request.transactionId,
        externalTransactionId: paymentResponse.externalTransactionId
      });

      return {
        errorResponse: {
          transactionId: request.transactionId,
          responseCode: TransferResponseCode.ERROR,
          message: TransferMessage.PAYMENT_PROCESSING_ERROR,
          networkMessage: undefined,
          networkCode: undefined
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
      eventId: request.transactionId,
      traceId: request.transactionId,
      correlationId: endToEndId,
      transactionId: request.transactionId,
      endToEndId,
      timeoutSeconds: TransferUseCase.TRANSFER_TIMEOUT_SECONDS
    });

    try {
      const confirmationResponse = await this.pendingTransferService.waitForConfirmation(
        request.transactionId,
        endToEndId,
        startedAt
      );

      const isApproved = confirmationResponse.responseCode === TransferResponseCode.APPROVED;

      return {
        transactionId: request.transactionId,
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
        eventId: request.transactionId,
        traceId: request.transactionId,
        correlationId: endToEndId,
        transactionId: request.transactionId,
        endToEndId,
        error: timeoutMessage
      });

      return {
        transactionId: request.transactionId,
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
    if (error instanceof KeyResolutionException) {
      const errorMessage = error.message;
      const extractedErrorInfo = extractNetworkErrorInfo(errorMessage);

      const errorInfo: import('../util/error-message.mapper').NetworkErrorInfo = extractedErrorInfo || {
        code: undefined,
        description: this.extractNetworkErrorMessageOnly(errorMessage),
        source: 'DIFE'
      };

      return this.buildErrorResponse(
        transactionId,
        TransferResponseCode.ERROR,
        TransferMessage.KEY_RESOLUTION_ERROR,
        errorInfo
      );
    }

    const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
    const errorInfo = extractNetworkErrorInfo(errorMessage);
    const mappedMessage = ErrorMessageMapper.mapToMessage(errorInfo);
    const responseCode = determineResponseCodeFromMessage(mappedMessage);
    const isDifeValidationErr = isDifeValidationError(errorMessage);
    const isMolValidationErr = isMolValidationError(errorMessage) || isMolValidationErrorByCode(errorInfo);

    if (isDifeValidationErr || isMolValidationErr) {
      const source = isDifeValidationErr ? ERROR_SOURCE_DIFE : ERROR_SOURCE_MOL;
      this.logger.warn(`${source} validation error detected`, {
        ...this.buildLogContext(transactionId),
        error: errorMessage
      });
    } else {
      this.logger.error('Transfer execution failed', {
        ...this.buildLogContext(transactionId),
        error: errorMessage
      });
    }

    return this.buildErrorResponse(transactionId, responseCode, mappedMessage, errorInfo);
  }

  private buildErrorResponse(
    transactionId: string,
    responseCode: TransferResponseCode,
    message: TransferMessage,
    errorInfo: import('../util/error-message.mapper').NetworkErrorInfo | null
  ): TransferResponseDto {
    const networkMessage = errorInfo
      ? ErrorMessageMapper.formatNetworkErrorMessage(errorInfo.description, errorInfo.source)
      : undefined;

    return {
      transactionId,
      responseCode,
      message,
      networkMessage,
      networkCode: errorInfo?.code
    };
  }

  private extractNetworkErrorMessageOnly(errorMessage: string): string {
    const difeCodePattern = /(DIFE-\d{4})/;
    const difeCodeMatch = errorMessage.match(difeCodePattern);

    if (difeCodeMatch) {
      const code = difeCodeMatch[1];
      const codeIndex = errorMessage.indexOf(code);
      const afterCode = errorMessage.substring(codeIndex + code.length).trim();
      const descriptionMatch = afterCode.match(/^[:\s]*(.+?)(?:\s*\(|$)/);
      if (descriptionMatch) {
        return descriptionMatch[1].trim();
      }
    }

    const technicalErrorPattern = /:\s*(?:Cannot read properties|TypeError|ReferenceError|Error:)\s*.+/i;
    if (technicalErrorPattern.test(errorMessage)) {
      const parts = errorMessage.split(technicalErrorPattern);
      if (parts.length > 0 && parts[0]) {
        const cleanMessage = parts[0].replace(/:\s*$/, '').trim();
        if (cleanMessage.toLowerCase().includes('key resolution')) {
          return cleanMessage;
        }
      }
    }

    const colonIndex = errorMessage.lastIndexOf(':');
    if (colonIndex > 0) {
      const beforeColon = errorMessage.substring(0, colonIndex).trim();
      const technicalKeywords = ['cannot read', 'typeerror', 'referenceerror', 'undefined', 'null'];
      const hasTechnicalError = technicalKeywords.some((keyword) =>
        errorMessage
          .substring(colonIndex + 1)
          .toLowerCase()
          .includes(keyword)
      );

      if (hasTechnicalError && beforeColon.toLowerCase().includes('key resolution')) {
        return beforeColon;
      }
    }

    return 'Key resolution failed';
  }
}
