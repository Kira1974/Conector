import { Injectable } from '@nestjs/common';
import {
  ThLogger,
  ThLoggerService,
  ThLoggerComponent,
  ThStandardResponse,
  ThResponseBuilder,
  ThAppStatusCode
} from 'themis';

import { IDifeProvider } from '@core/provider';
import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { calculateKeyType, generateCorrelationId } from '@core/util';
import { extractNetworkErrorInfo } from '@core/util/network-error-extractor.util';
import { ErrorMessageMapper } from '@core/util/error-message.mapper';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import { TransferMessage } from '@core/constant';
import {
  AccountQuerySuccessDataDto,
  AccountQueryErrorDataDto,
  UserDataDto,
  AccountInfoDto,
  AccountDetailDto
} from '@infrastructure/entrypoint/dto';
import { StandardizedResponseCodeMapper } from '@infrastructure/entrypoint/rest/mappers/standardized-response-code.mapper';

export type AccountQueryResponseDto = ThStandardResponse<AccountQuerySuccessDataDto | AccountQueryErrorDataDto>;

export interface AccountQueryResult {
  response: AccountQueryResponseDto;
  correlationId: string;
  difeExecutionId?: string;
  httpStatus: number;
}

@Injectable()
export class AccountQueryUseCase {
  private readonly logger: ThLogger;

  constructor(
    private readonly difeProvider: IDifeProvider,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(AccountQueryUseCase.name, ThLoggerComponent.APPLICATION);
  }

  async execute(keyValue: string): Promise<AccountQueryResult> {
    const keyType = calculateKeyType(keyValue);
    const correlationId = generateCorrelationId();

    try {
      const request: KeyResolutionRequest = {
        correlationId,
        key: keyValue,
        keyType
      };

      const difeResponse = await this.difeProvider.resolveKey(request);
      const keyResolution: KeyResolutionResponse = this.mapDifeResponseToDomain(difeResponse, correlationId);
      const { response, httpStatus } = this.processKeyResolution(keyResolution, keyValue, keyType, correlationId);

      return {
        response,
        correlationId,
        difeExecutionId: difeResponse.execution_id,
        httpStatus
      };
    } catch (error: unknown) {
      const { response, httpStatus } = this.handleError(error, correlationId);

      return {
        response,
        correlationId,
        httpStatus
      };
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
    keyValue: string,
    keyType: string,
    correlationId: string
  ): { response: AccountQueryResponseDto; httpStatus: number } {
    if (keyResolution.errors && keyResolution.errors.length > 0) {
      const errorMessage = keyResolution.errors.join(', ');

      this.logger.warn('DIFE returned business validation errors', {
        correlationId,
        difeCorrelationId: keyResolution.correlationId || correlationId,
        errorCount: keyResolution.errors.length,
        errorCodes: keyResolution.errors
      });

      return this.buildErrorResponse(errorMessage);
    }

    if (!keyResolution.resolvedKey) {
      this.logger.error('Key resolution failed - incomplete response from DIFE', {
        correlationId,
        difeCorrelationId: keyResolution.correlationId || correlationId
      });

      return this.buildErrorResponse('Key resolution failed');
    }

    this.logger.log('Key resolved successfully', {
      correlationId,
      difeCorrelationId: keyResolution.correlationId || correlationId,
      difeExecutionId: keyResolution.executionId
    });

    return this.buildSuccessResponse(keyValue, keyType, keyResolution);
  }

  private buildSuccessResponse(
    keyValue: string,
    keyType: string,
    keyResolution: KeyResolutionResponse
  ): { response: AccountQueryResponseDto; httpStatus: number } {
    const resolvedKey = keyResolution.resolvedKey;
    const person = resolvedKey.person;
    const paymentMethod = resolvedKey.paymentMethod;

    const nameParts: string[] = [];
    if (person.firstName) nameParts.push(person.firstName);
    if (person.secondName) nameParts.push(person.secondName);
    if (person.lastName) nameParts.push(person.lastName);
    if (person.secondLastName) nameParts.push(person.secondLastName);
    const fullName = nameParts.length > 0 ? nameParts.join(' ') : person.legalCompanyName || 'Unknown';

    const accountDetail: AccountDetailDto = {
      KEY_VALUE: keyValue,
      BREB_DIFE_CORRELATION_ID: keyResolution.correlationId || '',
      BREB_DIFE_TRACE_ID: keyResolution.traceId || '',
      BREB_DIFE_EXECUTION_ID: keyResolution.executionId,
      BREB_KEY_TYPE: keyType,
      BREB_PARTICIPANT_NIT: resolvedKey.participant.nit,
      BREB_PARTICIPANT_SPBVI: resolvedKey.participant.spbvi
    };

    const accountInfo: AccountInfoDto = {
      type: paymentMethod.type,
      number: paymentMethod.number,
      detail: accountDetail
    };

    const userData: UserDataDto = {
      name: fullName,
      personType: person.personType,
      documentType: person.identificationType,
      documentNumber: person.identificationNumber,
      account: accountInfo
    };

    const data: AccountQuerySuccessDataDto = {
      externalTransactionId: keyResolution.executionId || '',
      state: 'SUCCESFUL',
      userData
    };

    const response = ThResponseBuilder.created(data, TransferMessage.KEY_RESOLUTION_SUCCESS);

    return {
      response,
      httpStatus: ThAppStatusCode.CREATED
    };
  }

  private buildErrorResponse(errorMessage: string): { response: AccountQueryResponseDto; httpStatus: number } {
    const errorInfo = extractNetworkErrorInfo(errorMessage);

    const transferMessage = ErrorMessageMapper.mapToMessage(errorInfo);
    const networkCode = errorInfo?.code;
    const networkDescription = errorInfo?.description || errorMessage;
    const formattedNetworkMessage = networkCode
      ? ErrorMessageMapper.formatNetworkErrorMessage(networkDescription, errorInfo?.source || 'DIFE')
      : networkDescription;

    const responseCode = StandardizedResponseCodeMapper.determineResponseCode(networkCode);
    const httpStatus = StandardizedResponseCodeMapper.mapToHttpStatus(responseCode, networkCode);

    const data: AccountQueryErrorDataDto = {
      networkCode,
      networkMessage: formattedNetworkMessage
    };

    const response = ThResponseBuilder.custom<AccountQueryErrorDataDto>(
      httpStatus as ThAppStatusCode,
      transferMessage,
      data
    );

    return {
      response,
      httpStatus
    };
  }

  private handleError(
    error: unknown,
    correlationId: string
  ): { response: AccountQueryResponseDto; httpStatus: number } {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    this.logger.error('Key resolution failed with exception', {
      correlationId,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    return this.buildErrorResponse(errorMessage);
  }
}
