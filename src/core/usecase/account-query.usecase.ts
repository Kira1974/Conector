import { Injectable } from '@nestjs/common';
import {
  ThLogger,
  ThLoggerService,
  ThLoggerComponent,
  ThResponseBuilder,
  ThStandardResponse
} from 'themis';

import { IDifeProvider } from '@core/provider';
import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { calculateKeyType, generateCorrelationId } from '@core/util';
import { KeyResolutionException } from '@core/exception/custom.exceptions';
import { ErrorMessageMapper, NetworkErrorInfo } from '@core/util/error-message.mapper';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import { TransferMessage, AccountQueryState, DifeErrorCodes } from '@core/constant';
import { AccountQueryDataDto, AccountQueryResult } from '@infrastructure/entrypoint/dto/account-query-response.dto';

@Injectable()
export class AccountQueryUseCase {
  private readonly logger: ThLogger;

  constructor(
    private readonly difeProvider: IDifeProvider,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(AccountQueryUseCase.name, ThLoggerComponent.APPLICATION);
  }

  async execute(key: string): Promise<AccountQueryResult> {
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
      const responseDto = this.processAccountQuery(keyResolution, difeResponse, key, keyType, correlationId);

      return { response: responseDto };
    } catch (error: unknown) {
      const errorResponse = this.handleError(error, key, keyType, correlationId);

      return { response: errorResponse };
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

  private processAccountQuery(
    keyResolution: KeyResolutionResponse,
    difeResponse: DifeKeyResponseDto,
    key: string,
    keyType: string,
    correlationId: string
  ): ThStandardResponse<AccountQueryDataDto> {
    if (keyResolution.errors && keyResolution.errors.length > 0) {
      const errorMessage = keyResolution.errors.join(', ');

      this.logger.warn('DIFE returned business validation errors', {
        correlationId,
        difeCorrelationId: keyResolution.correlationId || correlationId,
        errorCount: keyResolution.errors.length,
        errorCodes: keyResolution.errors
      });

      return this.buildErrorResponse(key, keyType, errorMessage, difeResponse);
    }

    if (!keyResolution.resolvedKey) {
      this.logger.error('Key resolution failed - incomplete response from DIFE', {
        correlationId,
        difeCorrelationId: keyResolution.correlationId || correlationId
      });

      return this.buildErrorResponse(key, keyType, 'Key resolution failed', difeResponse);
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
  ): ThStandardResponse<AccountQueryDataDto> {
    const resolvedKey = keyResolution.resolvedKey;
    const person = resolvedKey.person;
    const paymentMethod = resolvedKey.paymentMethod;

    const fullName = [person.firstName, person.secondName, person.lastName, person.secondLastName]
      .filter(Boolean)
      .join(' ');

    const data: AccountQueryDataDto = {
      externalTransactionId: difeResponse.execution_id || '',
      state: AccountQueryState.SUCCESSFUL,
      userData: {
        name: fullName,
        personType: person.personType,
        documentType: person.identificationType,
        documentNumber: person.identificationNumber,
        account: {
          type: paymentMethod.type,
          number: paymentMethod.number,
          detail: {
            KEY_VALUE: key,
            BREB_DIFE_EXECUTION_ID: difeResponse.execution_id || '',
            BREB_DIFE_CORRELATION_ID: difeResponse.correlation_id || '',
            BREB_DIFE_TRACE_ID: difeResponse.trace_id || '',
            BREB_KEY_TYPE: keyType,
            BREB_PARTICIPANT_NIT: resolvedKey.participant.nit,
            BREB_PARTICIPANT_SPBVI: resolvedKey.participant.spbvi
          }
        }
      }
    };

    return ThResponseBuilder.created(data, TransferMessage.KEY_RESOLUTION_SUCCESS);
  }

  private buildErrorResponse(
    key: string,
    keyType: string,
    errorMessage: string,
    difeResponse?: DifeKeyResponseDto
  ): ThStandardResponse<AccountQueryDataDto> {
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

    const errorState = this.determineErrorState(networkCode);

    const data: AccountQueryDataDto = {
      externalTransactionId: difeResponse?.execution_id || '',
      state: errorState,
      ...(networkCode && { networkCode }),
      ...(formattedNetworkMessage && { networkMessage: formattedNetworkMessage }),
      userData: {
        account: {
          detail: {
            KEY_VALUE: key,
            BREB_DIFE_EXECUTION_ID: difeResponse?.execution_id || '',
            BREB_DIFE_CORRELATION_ID: difeResponse?.correlation_id || '',
            BREB_DIFE_TRACE_ID: difeResponse?.trace_id || '',
            BREB_KEY_TYPE: keyType
          }
        }
      }
    };

    return this.buildErrorResponseByNetworkCode(networkCode, transferMessage, data);
  }

  private determineErrorState(networkCode: string | undefined): AccountQueryState {
    if (!networkCode) {
      return AccountQueryState.ERROR;
    }

    if (DifeErrorCodes.FORMAT_VALIDATION.includes(networkCode)) {
      return AccountQueryState.VALIDATION_FAILED;
    }

    if (DifeErrorCodes.BUSINESS_VALIDATION.includes(networkCode)) {
      return AccountQueryState.REJECTED_BY_PROVIDER;
    }

    if (DifeErrorCodes.SERVICE_ERROR.includes(networkCode) || networkCode.startsWith('DIFE-999')) {
      return AccountQueryState.PROVIDER_ERROR;
    }

    return AccountQueryState.ERROR;
  }

  private buildErrorResponseByNetworkCode(
    networkCode: string | undefined,
    message: string,
    data: AccountQueryDataDto
  ): ThStandardResponse<AccountQueryDataDto> {
    if (!networkCode) {
      return ThResponseBuilder.internalError(message, data);
    }

    if (DifeErrorCodes.FORMAT_VALIDATION.includes(networkCode)) {
      return ThResponseBuilder.badRequest(message, data);
    }

    if (DifeErrorCodes.BUSINESS_VALIDATION.includes(networkCode)) {
      return ThResponseBuilder.validationError(data, message);
    }

    if (DifeErrorCodes.SERVICE_ERROR.includes(networkCode) || networkCode.startsWith('DIFE-999')) {
      return ThResponseBuilder.externalServiceError(message, data);
    }

    return ThResponseBuilder.internalError(message, data);
  }

  private handleError(
    error: unknown,
    key: string,
    keyType: string,
    correlationId: string
  ): ThStandardResponse<AccountQueryDataDto> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    this.logger.error('Account query failed with exception', {
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
