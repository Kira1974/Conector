import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { IDifeProvider } from '@core/provider';
import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { calculateKeyType, generateCorrelationId, buildAdditionalDataFromKeyResolution } from '@core/util';
import { KeyResolutionException } from '@core/exception/custom.exceptions';
import { KeyResolutionResponseDto } from '@infrastructure/entrypoint/dto';
import { ErrorMessageMapper, NetworkErrorInfo } from '@core/util/error-message.mapper';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

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
    const keyType = calculateKeyType(key);
    const correlationId = generateCorrelationId();

    try {
      const request: KeyResolutionRequest = {
        correlationId,
        key,
        keyType
      };

      const difeResponse = await this.difeProvider.resolveKey(request);

      const keyResolution: KeyResolutionResponse = this.mapDifeResponseToDomain(difeResponse, correlationId);

      return this.processKeyResolution(keyResolution, difeResponse, key, keyType, correlationId);
    } catch (error: unknown) {
      return this.handleError(error, key, keyType, correlationId);
    }
  }

  private mapDifeResponseToDomain(
    difeResponse: DifeKeyResponseDto,
    fallbackCorrelationId: string
  ): KeyResolutionResponse {
    if (difeResponse.status === 'ERROR' && difeResponse.errors) {
      return {
        correlationId: difeResponse.correlation_id || fallbackCorrelationId,
        executionId: difeResponse.execution_id,
        traceId: difeResponse.trace_id,
        status: difeResponse.status,
        errors: difeResponse.errors.map((e) => `${e.description} (${e.code})`)
      };
    }
    if (!difeResponse.key) {
      return {
        correlationId: difeResponse.correlation_id || fallbackCorrelationId,
        executionId: difeResponse.execution_id,
        traceId: difeResponse.trace_id,
        status: difeResponse.status,
        errors: ['Key resolution failed - no key data in response']
      };
    }
    const difeKey = difeResponse.key;

    return {
      correlationId: difeResponse.correlation_id || fallbackCorrelationId,
      executionId: difeResponse.execution_id,
      traceId: difeResponse.trace_id,
      status: difeResponse.status,
      resolvedKey: {
        keyType: difeKey.key.type,
        keyValue: difeKey.key.value,
        participant: {
          nit: difeKey.participant.nit,
          spbvi: difeKey.participant.spbvi
        },
        paymentMethod: {
          number: difeKey.payment_method.number,
          type: difeKey.payment_method.type
        },
        person: {
          identificationNumber: difeKey.person.identification.number,
          identificationType: difeKey.person.identification.type,
          legalCompanyName: difeKey.person.legal_name,
          firstName: difeKey.person.name.first_name,
          lastName: difeKey.person.name.last_name,
          secondName: difeKey.person.name.second_name,
          secondLastName: difeKey.person.name.second_last_name,
          personType: difeKey.person.type
        }
      }
    };
  }

  private processKeyResolution(
    keyResolution: KeyResolutionResponse,
    difeResponse: DifeKeyResponseDto,
    key: string,
    keyType: string,
    correlationId: string
  ): KeyResolutionResponseDto {
    if (keyResolution.errors && keyResolution.errors.length > 0) {
      const errorMessage = keyResolution.errors.join(', ');

      this.logger.warn('DIFE returned business validation errors', {
        correlationId,
        difeCorrelationId: keyResolution.correlationId || correlationId,
        errorCount: keyResolution.errors.length,
        errorCodes: keyResolution.errors
      });

      return this.buildErrorResponse(key, keyType, errorMessage);
    }

    if (!keyResolution.resolvedKey) {
      this.logger.error('Key resolution failed - incomplete response from DIFE', {
        correlationId,
        difeCorrelationId: keyResolution.correlationId || correlationId
      });

      return this.buildErrorResponse(key, keyType, 'Key resolution failed');
    }

    this.logger.log('Key resolved successfully', {
      correlationId,
      difeCorrelationId: keyResolution.correlationId || correlationId,
      difeExecutionId: keyResolution.executionId
    });

    return this.buildSuccessResponse(key, keyType, keyResolution, difeResponse);
  }

  private buildSuccessResponse(
    key: string,
    keyType: string,
    keyResolution: KeyResolutionResponse,
    difeResponse: DifeKeyResponseDto
  ): KeyResolutionResponseDto {
    const resolvedKey = keyResolution.resolvedKey;
    const person = resolvedKey.person;
    const paymentMethod = resolvedKey.paymentMethod;

    const additionalData = buildAdditionalDataFromKeyResolution(difeResponse);
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

  private handleError(error: unknown, key: string, keyType: string, correlationId: string): KeyResolutionResponseDto {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    this.logger.error('Key resolution failed with exception', {
      correlationId,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    if (error instanceof KeyResolutionException) {
      return this.buildErrorResponse(key, keyType, error.message);
    }

    return this.buildErrorResponse(key, keyType, errorMessage);
  }
}
