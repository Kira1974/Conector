import { URLSearchParams } from 'url';

import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';
import { AxiosResponse } from 'axios';

import { ExternalServiceException, PaymentProcessingException } from '@core/exception/custom.exceptions';
import { IMolPaymentProvider } from '@core/provider';
import {
  formatTimestampWithoutZ,
  determineResponseCodeFromMessage,
  obfuscateName,
  maskAccountNumber
} from '@core/util';
import { AdditionalDataKey } from '@core/model';
import { TransferMessage } from '@core/constant';
import { ErrorMessageMapper, NetworkErrorInfo } from '@core/util/error-message.mapper';
import { ExternalServicesConfigService } from '@config/external-services-config.service';
import { LoggingConfigService } from '@config/logging-config.service';
import { MolPayerConfigService } from '@config/mol-payer-config.service';

import { ResilienceConfigService } from '../resilience-config.service';
import { buildNetworkRequestLog, buildNetworkResponseLog } from '../util/network-log.util';
import { TransferRequestDto, TransferResponseDto, TransferResponseCode } from '../../entrypoint/dto';

import {
  MolPaymentResponse,
  MolPaymentRequestDto,
  MolPaymentQueryRequestDto,
  MolPaymentQueryResponseDto,
  DifeKeyResponseDto
} from './dto';

import { AuthService, HttpClientService } from './';

interface MolPayerConfiguration {
  identificationType: string;
  identificationValue: string;
  name: string;
  paymentMethodType: string;
  paymentMethodValue: string;
  paymentMethodCurrency: string;
}

@Injectable()
export class MolPaymentProvider implements IMolPaymentProvider {
  private readonly logger: ThLogger;
  private readonly ENABLE_HTTP_HEADERS_LOG: boolean;

  constructor(
    private readonly http: HttpClientService,
    private readonly auth: AuthService,
    private readonly loggerService: ThLoggerService,
    private readonly resilienceConfig: ResilienceConfigService,
    private readonly externalServicesConfig: ExternalServicesConfigService,
    private readonly loggingConfig: LoggingConfigService,
    private readonly molPayerConfig: MolPayerConfigService
  ) {
    this.logger = this.loggerService.getLogger(MolPaymentProvider.name, ThLoggerComponent.INFRASTRUCTURE);
    this.ENABLE_HTTP_HEADERS_LOG = this.loggingConfig.isHttpHeadersLogEnabled();
  }

  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('payment').setAction('create'),
    tags: ['payment', 'mol', 'create']
  })
  async createPayment(request: TransferRequestDto, keyResolution: DifeKeyResponseDto): Promise<TransferResponseDto> {
    try {
      const baseUrl = this.externalServicesConfig.getMolBaseUrl();
      const url = `${baseUrl}/v1/payment`;
      const dto: MolPaymentRequestDto = this.toPaymentRequestDto(request, keyResolution);

      this.logger.log('Creating MOL payment', {
        internalId: request.transaction.id,
        value: request.transaction.amount.total,
        baseUrl
      });

      let headers = await this.buildHeaders(baseUrl);
      const timeout = this.resilienceConfig.getMolTimeout();

      const molRequestCorrelationId = dto.internal_id || request.transaction.id;

      const requestLog = buildNetworkRequestLog({
        url,
        method: 'POST',
        requestBody: JSON.stringify(dto, null, 2),
        transactionId: request.transaction.id,
        headers,
        enableHttpHeadersLog: this.ENABLE_HTTP_HEADERS_LOG
      });
      requestLog.internalId = dto.internal_id;

      this.logger.log('NETWORK_REQUEST MOL', requestLog);

      let response = await this.http.instance.post<MolPaymentResponse>(url, dto, {
        headers,
        timeout
      });

      const endToEndId = response.data?.end_to_end_id;

      this.logMolPaymentResponse(response, {
        transactionId: request.transaction.id,
        internalId: dto.internal_id,
        endToEndId
      });

      if (response.status === 401 || response.status === 403) {
        this.logger.warn('MOL request failed with authentication error, clearing token cache and retrying', {
          correlationId: molRequestCorrelationId,
          transactionId: request.transaction.id,
          status: response.status
        });

        this.auth.clearCache();
        headers = await this.buildHeaders(baseUrl);

        response = await this.http.instance.post<MolPaymentResponse>(url, dto, {
          headers,
          timeout
        });

        const retryEndToEndId = response.data?.end_to_end_id;

        this.logMolPaymentResponse(response, {
          transactionId: request.transaction.id,
          internalId: dto.internal_id,
          endToEndId: retryEndToEndId,
          retry: true
        });
      }

      return this.handlePaymentResponse(response, request, keyResolution);
    } catch (error: unknown) {
      this.logger.error('Payment creation failed', {
        correlationId: request.transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof PaymentProcessingException || error instanceof ExternalServiceException) {
        throw error;
      }

      throw new PaymentProcessingException(
        error instanceof Error ? error.message : 'Unknown error occurred',
        request.transaction.id || ''
      );
    }
  }

  async queryPaymentStatus(request: MolPaymentQueryRequestDto, timeout?: number): Promise<MolPaymentQueryResponseDto> {
    try {
      this.validateQueryRequest(request);

      const baseUrl = this.externalServicesConfig.getMolBaseUrl();
      const url = `${baseUrl}/v1/payments`;

      const queryParams = this.buildQueryParams(request);
      const queryString = new URLSearchParams(queryParams).toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      this.logger.log('Querying MOL payment status', {
        queryParams,
        baseUrl,
        timeout: timeout || this.resilienceConfig.getMolTimeout()
      });

      let headers = await this.buildHeaders(baseUrl);
      const requestTimeout = timeout || this.resilienceConfig.getMolTimeout();

      const queryCorrelationId = request.end_to_end_id || request.internal_id || 'query-payment-status';
      const queryEventId = request.internal_id || request.end_to_end_id || 'query-payment-status';
      const queryTraceId = queryEventId;

      const requestLog = buildNetworkRequestLog({
        url: fullUrl,
        method: 'GET',
        headers,
        enableHttpHeadersLog: this.ENABLE_HTTP_HEADERS_LOG
      });

      if (request.internal_id) {
        requestLog.internalId = request.internal_id;
      }

      if (request.end_to_end_id) {
        requestLog.endToEndId = request.end_to_end_id;
      }

      this.logger.log('NETWORK_REQUEST MOL_QUERY', requestLog);

      let response = await this.http.instance.get<MolPaymentQueryResponseDto>(url, {
        headers,
        params: queryParams,
        timeout: requestTimeout
      });

      this.logMolQueryResponse(response, {
        internalId: request.internal_id,
        endToEndId: request.end_to_end_id,
        url: fullUrl
      });

      if (response.status === 401 || response.status === 403) {
        this.logger.warn('MOL query request failed with authentication error, clearing token cache and retrying', {
          eventId: queryEventId,
          traceId: queryTraceId,
          correlationId: queryCorrelationId,
          status: response.status
        });

        this.auth.clearCache();
        headers = await this.buildHeaders(baseUrl);

        response = await this.http.instance.get<MolPaymentQueryResponseDto>(url, {
          headers,
          params: queryParams,
          timeout: requestTimeout
        });

        this.logMolQueryResponse(response, {
          internalId: request.internal_id,
          endToEndId: request.end_to_end_id,
          url: fullUrl,
          retry: true
        });
      }

      return this.handleQueryResponse(response);
    } catch (error: unknown) {
      this.logger.error('Payment status query failed', {
        queryParams: request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof PaymentProcessingException || error instanceof ExternalServiceException) {
        throw error;
      }

      throw new PaymentProcessingException(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'query-payment-status'
      );
    }
  }

  private async buildHeaders(_baseUrl: string): Promise<Record<string, string>> {
    const token = await this.auth.getToken();

    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    };
  }

  private handleQueryResponse(response: AxiosResponse<MolPaymentQueryResponseDto>): MolPaymentQueryResponseDto {
    if (response.status >= 400) {
      let errorDescription = '';

      if (response.data?.errors && response.data.errors.length > 0) {
        errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
      } else {
        errorDescription = `HTTP ${response.status} error`;
      }

      this.logger.error('MOL Query API returned HTTP error', {
        httpStatus: response.status,
        error: errorDescription
      });

      throw new PaymentProcessingException(errorDescription, 'query-payment-status');
    }

    return response.data;
  }

  private validateQueryRequest(request: MolPaymentQueryRequestDto): void {
    const hasAnyParameter = !!(
      request.created_at_start ||
      request.created_at_end ||
      request.end_to_end_id ||
      request.internal_id
    );

    if (!hasAnyParameter) {
      throw new PaymentProcessingException('At least one query parameter must be provided', 'query-payment-status');
    }

    if (request.created_at_start && !request.created_at_end) {
      throw new PaymentProcessingException(
        'When using created_at.start, created_at.end must also be provided',
        'query-payment-status'
      );
    }

    if (request.created_at_end && !request.created_at_start) {
      throw new PaymentProcessingException(
        'When using created_at.end, created_at.start must also be provided',
        'query-payment-status'
      );
    }

    if (request.created_at_start && request.created_at_end) {
      const startDate = new Date(request.created_at_start);
      const endDate = new Date(request.created_at_end);
      const diffInMs = endDate.getTime() - startDate.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays > 1) {
        throw new PaymentProcessingException('Date range cannot exceed 1 day', 'query-payment-status');
      }

      if (diffInDays < 0) {
        throw new PaymentProcessingException('created_at.start must be before created_at.end', 'query-payment-status');
      }
    }
  }

  private buildQueryParams(request: MolPaymentQueryRequestDto): Record<string, string> {
    const params: Record<string, string> = {};

    if (request.created_at_start) {
      params['created_at.start'] = request.created_at_start;
    }

    if (request.created_at_end) {
      params['created_at.end'] = request.created_at_end;
    }

    if (request.end_to_end_id) {
      params.end_to_end_id = request.end_to_end_id;
    }

    if (request.internal_id) {
      params.internal_id = request.internal_id;
    }

    return params;
  }

  private handlePaymentResponse(
    response: AxiosResponse<MolPaymentResponse>,
    request: TransferRequestDto,
    keyResolution: DifeKeyResponseDto
  ): TransferResponseDto {
    const difeExecutionId = keyResolution.execution_id || '';
    const molExecutionId = response.data?.execution_id || '';
    const endToEndId = response.data?.end_to_end_id;
    const errorCode = response.data?.error?.code || response.data?.errors?.[0]?.code || '';
    const errorMessage = response.data?.error?.description || response.data?.error?.message || '';

    const additionalData = this.buildAdditionalDataWithKeyInfo(
      keyResolution,
      endToEndId,
      difeExecutionId,
      molExecutionId
    );

    if (errorCode) {
      additionalData.NETWORK_CODE = errorCode;
    }
    if (errorMessage) {
      additionalData.NETWORK_MESSAGE = errorMessage;
    }

    if (response.status >= 400 && response.status < 500) {
      const errorDescription = this.extractErrorDescription(response, 'Validation error');

      this.logger.error('MOL API returned client error', {
        internalId: request.transaction.id,
        httpStatus: response.status,
        errorCode,
        errorId: response.data?.error?.id,
        error: errorDescription
      });

      let responseCode: TransferResponseCode;
      if (response.status === 400) {
        responseCode = TransferResponseCode.VALIDATION_FAILED;
      } else if (response.status === 422) {
        responseCode = TransferResponseCode.REJECTED_BY_PROVIDER;
      } else {
        const errorInfo: NetworkErrorInfo = {
          code: errorCode,
          description: errorMessage || errorDescription,
          source: 'MOL'
        };
        responseCode = determineResponseCodeFromMessage(ErrorMessageMapper.mapToMessage(errorInfo), true, errorInfo);
      }

      return this.buildMolErrorResponse(
        request.transaction.id,
        errorCode,
        errorMessage || errorDescription,
        endToEndId,
        additionalData,
        responseCode
      );
    }

    if (response.status >= 500) {
      const errorDescription = this.extractErrorDescription(response, 'Provider error');

      this.logger.error('MOL API returned server error', {
        internalId: request.transaction.id,
        httpStatus: response.status,
        errorCode,
        errorId: response.data?.error?.id,
        error: errorDescription
      });

      return this.buildMolErrorResponse(
        request.transaction.id,
        errorCode,
        errorMessage || errorDescription,
        endToEndId,
        additionalData,
        TransferResponseCode.PROVIDER_ERROR,
        TransferMessage.PROVIDER_ERROR
      );
    }

    if (response.data?.status === 'ERROR') {
      const statusErrorCode = response.data?.errors?.[0]?.code || response.data?.error?.code;
      const errorDescription = this.extractErrorDescription(
        response,
        'MOL returned ERROR status without error details'
      );

      this.logger.error('MOL API returned ERROR status', {
        internalId: request.transaction.id,
        errorCode: statusErrorCode,
        endToEndId,
        executionId: molExecutionId,
        error: errorDescription
      });

      return this.buildMolErrorResponse(
        request.transaction.id,
        statusErrorCode,
        errorDescription,
        endToEndId,
        additionalData
      );
    }

    if (response.data?.error) {
      const errorDescription = response.data.error.description || response.data.error.message || 'MOL API error';

      this.logger.error('MOL API returned error object', {
        internalId: request.transaction.id,
        errorCode: response.data.error.code,
        errorId: response.data.error.id,
        error: errorDescription
      });

      return this.buildMolErrorResponse(
        request.transaction.id,
        response.data.error.code,
        errorDescription,
        endToEndId,
        additionalData
      );
    }

    const molStatus = response.data?.status;
    let responseCode: TransferResponseCode;
    let message: TransferMessage;

    if (molStatus === 'COMPLETED' || molStatus === 'PROCESSING') {
      responseCode = TransferResponseCode.APPROVED;
      message = TransferMessage.PAYMENT_APPROVED;
    } else if (molStatus === 'PENDING') {
      responseCode = TransferResponseCode.PENDING;
      message = TransferMessage.PAYMENT_PENDING;
    } else {
      this.logger.warn('MOL API returned unknown status', {
        internalId: request.transaction.id,
        status: molStatus
      });
      responseCode = TransferResponseCode.ERROR;
      message = TransferMessage.PAYMENT_PROCESSING_ERROR;
    }

    return {
      transactionId: request.transaction.id,
      responseCode,
      message,
      networkMessage: undefined,
      networkCode: undefined,
      externalTransactionId: endToEndId,
      additionalData
    };
  }

  private extractErrorDescription(response: AxiosResponse<MolPaymentResponse>, defaultMessage: string): string {
    if (response.data?.errors && response.data.errors.length > 0) {
      return response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
    }

    if (response.data?.error) {
      const description = response.data.error.description || response.data.error.message;
      const code = response.data.error.code;
      if (code && description) {
        return `${code}: ${description}`;
      }
      return description || defaultMessage;
    }

    if (response.status >= 400) {
      return `HTTP ${response.status} error`;
    }

    return defaultMessage;
  }

  private buildMolErrorResponse(
    transactionId: string,
    errorCode: string | undefined,
    errorDescription: string,
    endToEndId: string | undefined,
    additionalData: Record<string, any>,
    overrideResponseCode?: TransferResponseCode,
    overrideMessage?: TransferMessage
  ): TransferResponseDto {
    const errorInfo: NetworkErrorInfo = {
      code: errorCode,
      description: errorDescription,
      source: 'MOL'
    };

    const mappedMessage = overrideMessage || ErrorMessageMapper.mapToMessage(errorInfo);
    const responseCode = overrideResponseCode || determineResponseCodeFromMessage(mappedMessage, true, errorInfo);

    return {
      transactionId,
      responseCode,
      message: mappedMessage,
      networkMessage: errorDescription,
      networkCode: errorCode,
      externalTransactionId: endToEndId,
      additionalData
    };
  }

  private buildAdditionalDataWithKeyInfo(
    keyResolution: DifeKeyResponseDto,
    endToEndId?: string,
    difeExecutionId?: string,
    molExecutionId?: string
  ): Record<string, any> {
    const additionalData: Record<string, any> = {};

    if (endToEndId) {
      additionalData[AdditionalDataKey.END_TO_END] = endToEndId;
    }
    if (difeExecutionId) {
      additionalData[AdditionalDataKey.DIFE_EXECUTION_ID] = difeExecutionId;
    }
    if (molExecutionId) {
      additionalData[AdditionalDataKey.MOL_EXECUTION_ID] = molExecutionId;
    }

    if (keyResolution.key) {
      if (keyResolution.key.person?.identification?.number) {
        additionalData.DOCUMENT_NUMBER = keyResolution.key.person.identification.number;
      }

      const firstName = keyResolution.key.person?.name?.first_name || '';
      const lastName = keyResolution.key.person?.name?.last_name || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      if (fullName) {
        additionalData.OBFUSCATED_NAME = obfuscateName(fullName);
      } else if (keyResolution.key.person?.legal_name) {
        additionalData.OBFUSCATED_NAME = obfuscateName(keyResolution.key.person.legal_name);
      }

      if (keyResolution.key.payment_method?.number) {
        additionalData.ACCOUNT_NUMBER = maskAccountNumber(keyResolution.key.payment_method.number);
      }

      if (keyResolution.key.payment_method?.type) {
        additionalData.ACCOUNT_TYPE = keyResolution.key.payment_method.type;
      }
    }

    return additionalData;
  }

  private toPaymentRequestDto(request: TransferRequestDto, keyResolution: DifeKeyResponseDto): MolPaymentRequestDto {
    const currency = request.transaction.amount.currency;
    const key = keyResolution.key; //TODO: Review if should change for the new contract changes
    if (!key?.person || !key?.payment_method) {
      throw new Error('Key resolution data is missing');
    }
    const payerConfiguration = this.getPayerConfigurationFromEnv();
    const creditorDifeIdentificationType = this.mapIdentificationTypeToMol(key.person.identification?.type || '');
    const now = formatTimestampWithoutZ();
    const keyType = key.key.type || 'OTHER';
    return {
      additional_informations: request.transaction.description,
      billing_responsible: 'DEBT',
      initiation_type: 'KEY',
      creditor: {
        identification: {
          type: creditorDifeIdentificationType,
          value: key.person.identification?.number || ''
        },
        key: {
          type: this.mapKeyTypeToMol(keyType),
          value: key.key.value
        },
        name:
          [key.person.name?.first_name, key.person.name?.last_name].filter(Boolean).join(' ') ||
          key.person.legal_name ||
          '',
        participant: {
          id: key.participant.nit || '',
          spbvi: key.participant.spbvi || ''
        },
        payment_method: {
          currency,
          type: this.mapPaymentMethodTypeToMol(key.payment_method.type || ''),
          value: key.payment_method.number || ''
        }
      },
      internal_id: keyResolution.correlation_id || '', //TODO: Review if should change for the new contract changes
      key_resolution_id: keyResolution.trace_id || '', //TODO: Review if should change for the new contract changes
      payer: {
        identification: {
          type: payerConfiguration.identificationType,
          value: payerConfiguration.identificationValue
        },
        name: payerConfiguration.name,
        payment_method: {
          currency: payerConfiguration.paymentMethodCurrency,
          type: payerConfiguration.paymentMethodType,
          value: payerConfiguration.paymentMethodValue
        }
      },
      qr_code_id: '',
      time_mark: {
        T110: now,
        T120: now
      },
      transaction_amount: request.transaction.amount.total.toFixed(2),
      transaction_type: 'BREB'
    };
  }

  private getPayerConfigurationFromEnv(): MolPayerConfiguration {
    return this.molPayerConfig.getPayerConfiguration();
  }

  private mapKeyTypeToMol(keyType: string): string {
    const keyTypeMap: Record<string, string> = {
      NRIC: 'IDENTIFICATION',
      M: 'PHONE',
      E: 'MAIL',
      O: 'ALPHANUMERIC',
      B: 'MERCHANT_CODE'
    };
    return keyTypeMap[keyType] || keyType;
  }

  private mapIdentificationTypeToMol(difeType: string): string {
    const identificationMap: Record<string, string> = {
      CC: 'CITIZENSHIP_ID',
      CE: 'FOREIGNER_ID',
      NIT: 'TAX_ID',
      NUIP: 'PERSONAL_ID',
      PPT: 'TEMPORARY_PROTECTION_ID',
      PEP: 'SPECIAL_RESIDENCE_ID',
      PAS: 'PASSPORT',
      TDI: 'IDENTITY_CARD'
    };
    return identificationMap[difeType] || difeType;
  }

  private mapPaymentMethodTypeToMol(difeType: string): string {
    const paymentMethodMap: Record<string, string> = {
      CAHO: 'SAVINGS_ACCOUNT',
      CCTE: 'CHECKING_ACCOUNT',
      DBMO: 'LOW_AMOUNT_DEPOSIT',
      DORD: 'REGULAR_DEPOSIT',
      DBMI: 'INCLUSIVE_AMOUNT_DEPOSIT'
    };
    return paymentMethodMap[difeType] || difeType;
  }

  /**
   * Log MOL payment response immediately after receiving it
   */
  private logMolPaymentResponse(
    response: AxiosResponse<MolPaymentResponse>,
    options: {
      eventId?: string;
      traceId?: string;
      correlationId?: string;
      transactionId: string;
      internalId: string;
      endToEndId?: string;
      retry?: boolean;
    }
  ): void {
    const responseLog = buildNetworkResponseLog(response, {
      transactionId: options.transactionId,
      retry: options.retry
    });

    if (options.eventId) {
      responseLog.eventId = options.eventId;
    }

    if (options.traceId) {
      responseLog.traceId = options.traceId;
    }

    if (options.correlationId) {
      responseLog.correlationId = options.correlationId;
    }

    responseLog.internalId = options.internalId;

    if (options.endToEndId) {
      responseLog.externalTransactionId = options.endToEndId;
      responseLog.endToEndId = options.endToEndId;
    }

    if (response.data?.execution_id) {
      responseLog.executionId = response.data.execution_id;
    }

    this.logger.log('NETWORK_RESPONSE MOL', responseLog);
  }

  /**
   * Log MOL query response immediately after receiving it
   */
  private logMolQueryResponse(
    response: AxiosResponse<MolPaymentQueryResponseDto>,
    options: {
      internalId?: string;
      endToEndId?: string;
      url: string;
      retry?: boolean;
    }
  ): void {
    const responseLog = buildNetworkResponseLog(response, {
      retry: options.retry
    });

    responseLog.url = options.url;
    responseLog.method = 'GET';

    if (options.internalId) {
      responseLog.internalId = options.internalId;
    }

    if (options.endToEndId) {
      responseLog.endToEndId = options.endToEndId;
    }

    this.logger.log('NETWORK_RESPONSE MOL_QUERY', responseLog);
  }
}
