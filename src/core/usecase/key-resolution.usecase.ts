import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { IDifeProvider } from '@core/provider';
import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { calculateKeyType, generateCorrelationId, buildAdditionalDataFromKeyResolution } from '@core/util';
import { KeyResolutionException } from '@core/exception/custom.exceptions';
import { KeyResolutionResponseDto } from '@infrastructure/entrypoint/dto';

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

      // TODO: Improve logging structure and add obfuscation
      this.logger.log('Retrieving key information', {
        correlationId,
        keyType,
        keyLength: key.length
      });

      const request: KeyResolutionRequest = {
        correlationId,
        key,
        keyType
      };

      const keyResolution: KeyResolutionResponse = await this.difeProvider.resolveKey(request);

      if (keyResolution.errors && keyResolution.errors.length > 0) {
        const errorMessage = keyResolution.errors.join(', ');

        // TODO: Improve error logging
        this.logger.warn('DIFE returned errors', {
          correlationId,
          errors: keyResolution.errors
        });

        return this.buildErrorResponse(key, keyType, errorMessage);
      }

      if (!keyResolution.resolvedKey) {
        // TODO: Improve error logging
        this.logger.error('Key information response missing resolvedKey', {
          correlationId
        });

        return this.buildErrorResponse(key, keyType, 'Key resolution failed');
      }

      const response = this.buildSuccessResponse(key, keyType, keyResolution);

      // TODO: Improve success logging
      this.logger.log('Key information retrieved successfully', {
        correlationId,
        documentType: response.documentType,
        accountType: response.accountType,
        personType: response.personType
      });

      return response;
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
    const errorCodeMatch = errorMessage.match(/^([A-Z]+-\d+)/);
    const networkCode = errorCodeMatch ? errorCodeMatch[1] : 'UNKNOWN';
    const networkMessage = errorCodeMatch ? errorMessage.replace(/^[A-Z]+-\d+:\s*/, '').trim() : errorMessage;

    // TODO: Move error message mapping to a separate mapper or constant file
    const message = this.buildCustomMessage(networkCode);

    return {
      key,
      keyType,
      responseCode: 'ERROR',
      message,
      networkCode,
      networkMessage
    };
  }

  private handleError(error: unknown, key: string): KeyResolutionResponseDto {
    const keyType = calculateKeyType(key);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // TODO: Improve error logging
    this.logger.error('Key information retrieval failed', {
      key: `${key.substring(0, 5)}***`,
      error: errorMessage
    });

    if (error instanceof KeyResolutionException) {
      return this.buildErrorResponse(key, keyType, error.message);
    }

    return this.buildErrorResponse(key, keyType, errorMessage);
  }

  // TODO: Move to a dedicated error message mapper (e.g., dife-error-message.mapper.ts)
  private buildCustomMessage(networkCode: string): string {
    const messages: Record<string, string> = {
      'DIFE-0001': 'custom message.',
      'DIFE-0002': 'custom message.',
      'DIFE-0003': 'custom message.',
      'DIFE-0004': 'custom message.',
      'DIFE-5003': 'custom message.',
      UNKNOWN: 'custom message.'
    };

    return messages[networkCode] || messages['UNKNOWN'];
  }
}
