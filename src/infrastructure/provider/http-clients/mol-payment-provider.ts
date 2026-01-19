import { URLSearchParams } from 'url';

import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';
import { AxiosResponse } from 'axios';

import { ExternalServiceException, PaymentProcessingException } from '@core/exception/custom.exceptions';
import { IMolPaymentProvider } from '@core/provider';
import { formatTimestampWithoutZ } from '@core/util';
import { AdditionalDataKey } from '@core/model';
import { TransferMessage } from '@core/constant';
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
        internalId: request.transactionId,
        value: request.transaction.amount.value,
        baseUrl
      });

      let headers = await this.buildHeaders(baseUrl);
      const timeout = this.resilienceConfig.getMolTimeout();

      const molEventId = request.transactionId;
      const molTraceId = request.transactionId;
      const molRequestCorrelationId = dto.internal_id || request.transactionId;

      const requestLog = buildNetworkRequestLog({
        url,
        method: 'POST',
        requestBody: JSON.stringify(dto, null, 2),
        eventId: molEventId,
        traceId: molTraceId,
        correlationId: molRequestCorrelationId,
        transactionId: request.transactionId,
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
      const molResponseCorrelationId = endToEndId || dto.internal_id || request.transactionId;

      this.logMolPaymentResponse(response, {
        eventId: molEventId,
        traceId: molTraceId,
        correlationId: molResponseCorrelationId,
        transactionId: request.transactionId,
        internalId: dto.internal_id,
        endToEndId
      });

      if (response.status === 401 || response.status === 403) {
        this.logger.warn('MOL request failed with authentication error, clearing token cache and retrying', {
          eventId: molEventId,
          traceId: molTraceId,
          correlationId: molRequestCorrelationId,
          transactionId: request.transactionId,
          status: response.status
        });

        this.auth.clearCache();
        headers = await this.buildHeaders(baseUrl);

        response = await this.http.instance.post<MolPaymentResponse>(url, dto, {
          headers,
          timeout
        });

        const retryEndToEndId = response.data?.end_to_end_id;
        const retryMolResponseCorrelationId = retryEndToEndId || dto.internal_id || request.transactionId;

        this.logMolPaymentResponse(response, {
          eventId: molEventId,
          traceId: molTraceId,
          correlationId: retryMolResponseCorrelationId,
          transactionId: request.transactionId,
          internalId: dto.internal_id,
          endToEndId: retryEndToEndId,
          retry: true
        });
      }

      return this.handlePaymentResponse(response, request, keyResolution);
    } catch (error: unknown) {
      this.logger.error('Payment creation failed', {
        correlationId: request.transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof PaymentProcessingException || error instanceof ExternalServiceException) {
        throw error;
      }

      throw new PaymentProcessingException(
        error instanceof Error ? error.message : 'Unknown error occurred',
        request.transactionId || ''
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
        eventId: queryEventId,
        traceId: queryTraceId,
        correlationId: queryCorrelationId,
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
        eventId: queryEventId,
        traceId: queryTraceId,
        correlationId: queryCorrelationId,
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
          eventId: queryEventId,
          traceId: queryTraceId,
          correlationId: queryCorrelationId,
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
    if (response.status >= 400) {
      let errorDescription = '';

      if (response.data?.errors && response.data.errors.length > 0) {
        errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
      } else if (response.data?.error) {
        errorDescription = response.data.error.description || response.data.error.message || 'Unknown error';
      } else {
        errorDescription = `HTTP ${response.status} error`;
      }

      this.logger.error('MOL API returned HTTP error', {
        internalId: request.transactionId,
        httpStatus: response.status,
        errorCode: response.data?.error?.code || response.data?.errors?.[0]?.code,
        errorId: response.data?.error?.id,
        error: errorDescription
      });

      throw new PaymentProcessingException(errorDescription, request.transactionId || '');
    }

    if (response.data?.status === 'ERROR') {
      let errorDescription = '';
      const errorCode = response.data?.error?.code || response.data?.errors?.[0]?.code;

      if (response.data?.errors && response.data.errors.length > 0) {
        errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
      } else if (response.data?.error) {
        const description = response.data.error.description || response.data.error.message || 'Unknown API error';
        errorDescription = errorCode ? `${errorCode}: ${description}` : description;
      } else {
        errorDescription = 'Unknown API error';
      }

      this.logger.error('MOL API returned error status', {
        internalId: request.transactionId,
        errorCode,
        error: errorDescription
      });

      throw new PaymentProcessingException(errorDescription, request.transactionId || '');
    }

    if (response.data?.error) {
      const errorDescription = response.data.error.description || response.data.error.message || 'MOL API error';

      this.logger.error('MOL API returned error object', {
        internalId: request.transactionId,
        errorCode: response.data.error.code,
        errorId: response.data.error.id,
        error: errorDescription
      });

      throw new PaymentProcessingException(errorDescription, request.transactionId || '');
    }

    const difeExecutionId = keyResolution.execution_id || '';
    const molExecutionId = response.data.execution_id || '';

    const isSuccess =
      response.data.status === 'PROCESSING' ||
      response.data.status === 'COMPLETED' ||
      response.data.status === 'PENDING';

    return {
      transactionId: request.transactionId,
      responseCode: isSuccess ? TransferResponseCode.APPROVED : TransferResponseCode.ERROR,
      message: isSuccess ? TransferMessage.PAYMENT_INITIATED : TransferMessage.PAYMENT_PROCESSING_ERROR,
      networkMessage: undefined,
      networkCode: undefined,
      externalTransactionId: response.data.end_to_end_id,
      additionalData: {
        [AdditionalDataKey.END_TO_END]: response.data.end_to_end_id,
        [AdditionalDataKey.DIFE_EXECUTION_ID]: difeExecutionId,
        [AdditionalDataKey.MOL_EXECUTION_ID]: molExecutionId
      }
    };
  }

  private toPaymentRequestDto(request: TransferRequestDto, keyResolution: DifeKeyResponseDto): MolPaymentRequestDto {
    const currency = request.transaction.amount.currency;
    const key = keyResolution.key;
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
      internal_id: keyResolution.correlation_id || '',
      key_resolution_id: keyResolution.trace_id || '',
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
      transaction_amount: request.transaction.amount.value.toFixed(2),
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
      eventId: string;
      traceId: string;
      correlationId: string;
      transactionId: string;
      internalId: string;
      endToEndId?: string;
      retry?: boolean;
    }
  ): void {
    const responseLog = buildNetworkResponseLog(response, {
      eventId: options.eventId,
      traceId: options.traceId,
      correlationId: options.correlationId,
      transactionId: options.transactionId,
      retry: options.retry
    });

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
      eventId: string;
      traceId: string;
      correlationId: string;
      internalId?: string;
      endToEndId?: string;
      url: string;
      retry?: boolean;
    }
  ): void {
    const responseLog = buildNetworkResponseLog(response, {
      eventId: options.eventId,
      traceId: options.traceId,
      correlationId: options.correlationId,
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
