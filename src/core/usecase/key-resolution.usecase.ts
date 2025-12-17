import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { IDifeProvider } from '@core/provider';
import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { calculateKeyType, generateCorrelationId, buildAdditionalDataFromKeyResolution } from '@core/util';
import { KeyResolutionException } from '@core/exception/custom.exceptions';
import { KeyResolutionResponseDto } from '@infrastructure/entrypoint/dto';
import { ErrorMessageMapper, NetworkErrorInfo } from '@core/util/error-message.mapper';

@Injectable()
export class KeyResolutionUseCase {
  private readonly logger: ThLogger;

  constructor(
    private readonly difeProvider: IDifeProvider,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(KeyResolutionUseCase.name, ThLoggerComponent.APPLICATION);
  }

  async execute(key: string): Promise<KeyResolutionResponseDto> {
    try {
      const keyType = calculateKeyType(key);
      const correlationId = generateCorrelationId();

      const request: KeyResolutionRequest = {
        correlationId,
        key,
        keyType
      };

      const keyResolution: KeyResolutionResponse = await this.difeProvider.resolveKey(request);

      if (keyResolution.errors && keyResolution.errors.length > 0) {
        const errorMessage = keyResolution.errors.join(', ');

        this.logger.warn('Key resolution returned errors', {
          difeCorrelationId: keyResolution.correlationId || correlationId,
          errorCount: keyResolution.errors.length
        });

        return this.buildErrorResponse(key, keyType, errorMessage);
      }

      if (!keyResolution.resolvedKey) {
        this.logger.error('Key resolution failed', {
          difeCorrelationId: keyResolution.correlationId || correlationId
        });

        return this.buildErrorResponse(key, keyType, 'Key resolution failed');
      }

      this.logger.log('Key resolved successfully', {
        difeCorrelationId: keyResolution.correlationId || correlationId,
        difeExecutionId: keyResolution.executionId
      });

      return this.buildSuccessResponse(key, keyType, keyResolution);
    } catch (error: unknown) {
      return this.handleError(error, key);
    }
  }

  private buildSuccessResponse(
    key: string,
    keyType: string,
    keyResolution: KeyResolutionResponse
  ): KeyResolutionResponseDto {
    const resolvedKey = keyResolution.resolvedKey;
    const person = resolvedKey.person;
    const paymentMethod = resolvedKey.paymentMethod;

    const additionalData = buildAdditionalDataFromKeyResolution(keyResolution);
    const personName = additionalData.OBFUSCATED_NAME || '';
    const accountNumber = additionalData.ACCOUNT_NUMBER || '';

    return {
      documentNumber: person.identificationNumber,
      documentType: person.identificationType,
      personName,
      personType: person.personType,
      financialEntityNit: resolvedKey.participant.nit,
      accountType: paymentMethod.type,
      accountNumber,
      key,
      keyType,
      responseCode: 'SUCCESS'
    };
  }

  private buildErrorResponse(key: string, keyType: string, errorMessage: string): KeyResolutionResponseDto {
    const errorCodeMatch = errorMessage.match(/\(([A-Z]+-\d{4})\)/) || errorMessage.match(/^([A-Z]+-\d+)/);
    const networkCode = errorCodeMatch ? errorCodeMatch[1] : undefined;

    let networkMessage = errorMessage;
    if (errorCodeMatch) {
      const descriptionMatch = errorMessage.match(/DIFE API error: (.+?) \([A-Z]+-\d{4}\)/);
      if (descriptionMatch) {
        networkMessage = descriptionMatch[1];
      } else {
        networkMessage = errorMessage.replace(/^[A-Z]+-\d+:\s*/, '').trim();
      }
    }
    const errorInfo: NetworkErrorInfo = {
      code: networkCode,
      description: networkMessage,
      source: 'DIFE'
    };

    const transferMessage = ErrorMessageMapper.mapToMessage(errorInfo);
    const formattedNetworkMessage = networkCode
      ? ErrorMessageMapper.formatNetworkErrorMessage(networkMessage, 'DIFE')
      : networkMessage;

    return {
      key,
      keyType,
      responseCode: 'ERROR',
      message: transferMessage,
      networkCode,
      networkMessage: formattedNetworkMessage
    };
  }

  private handleError(error: unknown, key: string): KeyResolutionResponseDto {
    const keyType = calculateKeyType(key);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    this.logger.error('Key resolution failed', {
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    if (error instanceof KeyResolutionException) {
      return this.buildErrorResponse(key, keyType, error.message);
    }

    return this.buildErrorResponse(key, keyType, errorMessage);
  }
}
