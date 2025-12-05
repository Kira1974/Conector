import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { IDifeProvider, IMolPaymentProvider } from '../provider';
import { AdditionalDataKey, KeyResolutionRequest, KeyResolutionResponse } from '../model';
import { generateCorrelationId, calculateKeyType } from '../util';
import { TransferFinalState } from '../constant';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';

import { PendingTransferService } from './pending-transfer.service';

@Injectable()
export class TransferUseCase {
  private readonly logger: ThLogger;

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
    this.logger.log('Starting transfer execution', {
      correlationId: request.transactionId,
      transactionId: request.transactionId,
      amount: request.transaction.amount.value,
      key: request.transactionParties.payee.accountInfo.value
    });

    try {
      const keyResolutionRequest = this.buildKeyResolutionRequest(request);
      const keyResolution: KeyResolutionResponse = await this.difeProvider.resolveKey(keyResolutionRequest);
      const difeAdditionalData = this.buildAdditionalDataFromKeyResolution(keyResolution);

      const difeErrorResponse = this.buildDifeErrorResponseIfAny(request, keyResolution);
      if (difeErrorResponse) {
        return difeErrorResponse;
      }

      const payeeValidationError = this.buildPayeeValidationErrorIfAny(request, keyResolution);
      if (payeeValidationError) {
        return payeeValidationError;
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Transfer execution failed', {
        correlationId: request.transactionId,
        transactionId: request.transactionId,
        error: errorMessage
      });

      return {
        transactionId: request.transactionId,
        responseCode: TransferResponseCode.ERROR,
        message: errorMessage
      };
    }
  }

  private buildPayeeValidationErrorIfAny(
    request: TransferRequestDto,
    keyResolution: KeyResolutionResponse
  ): TransferResponseDto | null {
    const payeeDocumentNumber = request.transactionParties.payee.documentNumber;
    if (!payeeDocumentNumber) {
      return null;
    }

    const resolvedKey = keyResolution.resolvedKey;
    const resolvedDocumentNumber = resolvedKey?.person.identificationNumber;

    if (!resolvedDocumentNumber) {
      return null;
    }

    if (payeeDocumentNumber !== resolvedDocumentNumber) {
      this.logger.warn('Payee document number does not match DIFE identification', {
        transactionId: request.transactionId,
        payeeDocumentNumber,
        resolvedDocumentNumber
      });

      return {
        transactionId: request.transactionId,
        responseCode: TransferResponseCode.VALIDATION_FAILED,
        message: 'Payee document number does not match resolved key identification number'
      };
    }

    return null;
  }

  private buildKeyResolutionRequest(request: TransferRequestDto): KeyResolutionRequest {
    const correlationId = generateCorrelationId();
    const key = request.transactionParties.payee.accountInfo.value;
    const keyType = calculateKeyType(key);

    return {
      correlationId,
      key,
      keyType
    };
  }

  private buildDifeErrorResponseIfAny(
    request: TransferRequestDto,
    keyResolution: KeyResolutionResponse
  ): TransferResponseDto | null {
    if (keyResolution.status !== 'ERROR') {
      return null;
    }

    const errorMessage = keyResolution.errors?.join(', ') || 'DIFE error';

    return {
      transactionId: request.transactionId,
      responseCode: TransferResponseCode.ERROR,
      message: errorMessage
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
          message: 'Payment response missing endToEndId'
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
      transactionId: request.transactionId,
      endToEndId,
      timeoutSeconds: 50
    });

    try {
      const confirmationResponse = await this.pendingTransferService.waitForConfirmation(
        request.transactionId,
        endToEndId,
        startedAt
      );

      this.logger.log('Transfer confirmation received', {
        transactionId: request.transactionId,
        endToEndId,
        responseCode: confirmationResponse.responseCode,
        message: confirmationResponse.message
      });

      return {
        transactionId: request.transactionId,
        responseCode:
          confirmationResponse.responseCode === TransferFinalState.APPROVED
            ? TransferResponseCode.APPROVED
            : TransferResponseCode.REJECTED_BY_PROVIDER,
        message: confirmationResponse.message,
        externalTransactionId: paymentResponse.externalTransactionId,
        additionalData: paymentResponse.additionalData
      };
    } catch (timeoutError) {
      const timeoutMessage =
        timeoutError instanceof Error
          ? timeoutError.message
          : 'The final response from the provider was never received.';

      this.logger.warn('Transfer confirmation timeout (controlled)', {
        transactionId: request.transactionId,
        endToEndId,
        error: timeoutMessage
      });

      return {
        transactionId: request.transactionId,
        responseCode: TransferResponseCode.PENDING,
        message: 'Payment pending',
        externalTransactionId: paymentResponse.externalTransactionId,
        additionalData: paymentResponse.additionalData
      };
    }
  }

  private buildAdditionalDataFromKeyResolution(keyResolution: KeyResolutionResponse): Record<string, string> {
    const resolvedKey = keyResolution.resolvedKey;
    if (!resolvedKey) {
      return {};
    }

    const documentNumber = resolvedKey.person.identificationNumber || '';
    const obfuscatedName = this.buildObfuscatedName(resolvedKey.person);
    const accountNumber = resolvedKey.paymentMethod.number || '';
    const maskedAccountNumber = this.buildMaskedAccountNumber(accountNumber);
    const accountType = resolvedKey.paymentMethod.type || '';

    return {
      [AdditionalDataKey.DOCUMENT_NUMBER]: documentNumber,
      [AdditionalDataKey.OBFUSCATED_NAME]: obfuscatedName,
      [AdditionalDataKey.ACCOUNT_NUMBER]: maskedAccountNumber,
      [AdditionalDataKey.ACCOUNT_TYPE]: accountType
    };
  }

  private buildObfuscatedName(person: KeyResolutionResponse['resolvedKey']['person']): string {
    const firstName = person.firstName || '';
    const secondName = person.secondName || '';
    const lastName = person.lastName || '';
    const secondLastName = person.secondLastName || '';

    const parts: string[] = [];
    const obfuscatedFirst = this.obfuscateWord(firstName);
    if (obfuscatedFirst) {
      parts.push(obfuscatedFirst);
    }

    const obfuscatedSecond = this.obfuscateWord(secondName);
    if (obfuscatedSecond) {
      parts.push(obfuscatedSecond);
    }

    const obfuscatedLast = this.obfuscateWord(lastName);
    if (obfuscatedLast) {
      parts.push(obfuscatedLast);
    }

    const obfuscatedSecondLast = this.obfuscateWord(secondLastName);
    if (obfuscatedSecondLast) {
      parts.push(obfuscatedSecondLast);
    }

    return parts.join(' ');
  }

  private obfuscateWord(word: string): string {
    if (!word) {
      return '';
    }

    const prefix = word.slice(0, 3);
    if (word.length <= 3) {
      return prefix;
    }

    const maskedLength = word.length - 3;
    const maskedSuffix = '*'.repeat(maskedLength);
    return `${prefix}${maskedSuffix}`;
  }

  private buildMaskedAccountNumber(accountNumber: string): string {
    if (!accountNumber) {
      return '';
    }

    const lastSix = accountNumber.slice(-6);
    const maskedPrefixLength = Math.max(accountNumber.length - 6, 0);
    const maskedPrefix = '*'.repeat(maskedPrefixLength);
    return `${maskedPrefix}${lastSix}`;
  }
}
