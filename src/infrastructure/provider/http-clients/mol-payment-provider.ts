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
        internalId: request.transaction.id,
        value: request.transaction.amount.total,
        baseUrl
      });

      let headers = await this.buildHeaders(baseUrl);
      const timeout = this.resilienceConfig.getMolTimeout();

      const molEventId = request.transaction.id;
      const molTraceId = request.transaction.id;
      const molRequestCorrelationId = dto.internal_id || request.transaction.id;

      const requestLog = buildNetworkRequestLog({
        url,
        method: 'POST',
        requestBody: JSON.stringify(dto, null, 2),
        eventId: molEventId,
        traceId: molTraceId,
        correlationId: molRequestCorrelationId,
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
      const molResponseCorrelationId = endToEndId || dto.internal_id || request.transaction.id;

      this.logMolPaymentResponse(response, {
        eventId: molEventId,
        traceId: molTraceId,
        correlationId: molResponseCorrelationId,
        transactionId: request.transaction.id,
        internalId: dto.internal_id,
        endToEndId
      });

      if (response.status === 401 || response.status === 403) {
        this.logger.warn('MOL request failed with authentication error, clearing token cache and retrying', {
          eventId: molEventId,
          traceId: molTraceId,
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
        const retryMolResponseCorrelationId = retryEndToEndId || dto.internal_id || request.transaction.id;

        this.logMolPaymentResponse(response, {
          eventId: molEventId,
          traceId: molTraceId,
          correlationId: retryMolResponseCorrelationId,
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
    const difeExecutionId = keyResolution.execution_id || '';
    const molExecutionId = response.data?.execution_id || '';
    const endToEndId = response.data?.end_to_end_id;
    const errorCode = response.data?.error?.code || response.data?.errors?.[0]?.code || '';
    const errorMessage = response.data?.error?.description || response.data?.error?.message || '';

    // Build base additionalData with execution IDs
    const additionalData: Record<string, any> = {
      [AdditionalDataKey.END_TO_END]: endToEndId,
      [AdditionalDataKey.DIFE_EXECUTION_ID]: difeExecutionId,
      [AdditionalDataKey.MOL_EXECUTION_ID]: molExecutionId
    };

    // Add key resolution fields if available
    if (keyResolution.key) {
      // Document number
      if (keyResolution.key.person?.identification?.number) {
        additionalData.DOCUMENT_NUMBER = keyResolution.key.person.identification.number;
      }

      // Obfuscated name
      const firstName = keyResolution.key.person?.name?.first_name || '';
      const lastName = keyResolution.key.person?.name?.last_name || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      if (fullName) {
        additionalData.OBFUSCATED_NAME = this.obfuscateName(fullName);
      } else if (keyResolution.key.person?.legal_name) {
        additionalData.OBFUSCATED_NAME = this.obfuscateName(keyResolution.key.person.legal_name);
      }

      // Account number (obfuscated)
      if (keyResolution.key.payment_method?.number) {
        additionalData.ACCOUNT_NUMBER = this.obfuscateAccountNumber(keyResolution.key.payment_method.number);
      }

      // Account type
      if (keyResolution.key.payment_method?.type) {
        additionalData.ACCOUNT_TYPE = keyResolution.key.payment_method.type;
      }
    }

    // Add network error information if present
    if (errorCode) {
      additionalData.NETWORK_CODE = errorCode;
    }
    if (errorMessage) {
      additionalData.NETWORK_MESSAGE = errorMessage;
    }

    // HTTP 400-499 errors (validation or rejection)
    if (response.status >= 400 && response.status < 500) {
      let errorDescription = '';

      if (response.data?.errors && response.data.errors.length > 0) {
        errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
      } else if (response.data?.error) {
        errorDescription = response.data.error.description || response.data.error.message || 'Validation error';
      } else {
        errorDescription = `HTTP ${response.status} error`;
      }

      this.logger.error('MOL API returned client error', {
        internalId: request.transaction.id,
        httpStatus: response.status,
        errorCode,
        errorId: response.data?.error?.id,
        error: errorDescription
      });

      // Determine if it's a validation error (400) or rejection (422)
      const isValidationError = this.isValidationErrorCode(errorCode) || response.status === 400;
      const responseCode = isValidationError ? TransferResponseCode.VALIDATION_FAILED : TransferResponseCode.REJECTED_BY_PROVIDER;
      const message = isValidationError ? TransferMessage.VALIDATION_ERROR : TransferMessage.TRANSACTION_REJECTED;

      return {
        transactionId: request.transaction.id,
        responseCode,
        message,
        networkMessage: errorMessage || errorDescription,
        networkCode: errorCode,
        externalTransactionId: endToEndId,
        additionalData
      };
    }

    // HTTP 500+ errors (provider or internal errors)
    if (response.status >= 500) {
      let errorDescription = '';

      if (response.data?.errors && response.data.errors.length > 0) {
        errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
      } else if (response.data?.error) {
        errorDescription = response.data.error.description || response.data.error.message || 'Provider error';
      } else {
        errorDescription = `HTTP ${response.status} error`;
      }

      this.logger.error('MOL API returned server error', {
        internalId: request.transaction.id,
        httpStatus: response.status,
        errorCode,
        errorId: response.data?.error?.id,
        error: errorDescription
      });

      return {
        transactionId: request.transaction.id,
        responseCode: TransferResponseCode.PROVIDER_ERROR,
        message: TransferMessage.PROVIDER_ERROR,
        networkMessage: errorMessage || errorDescription,
        networkCode: errorCode,
        externalTransactionId: endToEndId,
        additionalData
      };
    }

    // Status-based error handling for 2xx responses with error status
    if (response.data?.status === 'ERROR') {
      let errorDescription = '';

      if (response.data?.errors && response.data.errors.length > 0) {
        errorDescription = response.data.errors.map((e) => `${e.code}: ${e.description}`).join(', ');
      } else if (response.data?.error) {
        const description = response.data.error.description || response.data.error.message || 'Unknown API error';
        errorDescription = errorCode ? `${errorCode}: ${description}` : description;
      } else {
        errorDescription = 'Unknown API error';
      }

      this.logger.error('MOL API returned error status', {
        internalId: request.transaction.id,
        errorCode,
        error: errorDescription
      });

      return {
        transactionId: request.transaction.id,
        responseCode: TransferResponseCode.ERROR,
        message: TransferMessage.PAYMENT_PROCESSING_ERROR,
        networkMessage: errorMessage || errorDescription,
        networkCode: errorCode,
        externalTransactionId: endToEndId,
        additionalData
      };
    }

    // Check for error object in successful HTTP response
    if (response.data?.error) {
      const errorDescription = response.data.error.description || response.data.error.message || 'MOL API error';

      this.logger.error('MOL API returned error object', {
        internalId: request.transaction.id,
        errorCode: response.data.error.code,
        errorId: response.data.error.id,
        error: errorDescription
      });

      return {
        transactionId: request.transaction.id,
        responseCode: TransferResponseCode.ERROR,
        message: TransferMessage.PAYMENT_PROCESSING_ERROR,
        networkMessage: errorDescription,
        networkCode: response.data.error.code,
        externalTransactionId: endToEndId,
        additionalData
      };
    }

    // Success cases based on MOL status
    const molStatus = response.data?.status;
    let responseCode: TransferResponseCode;
    let message: TransferMessage;

    if (molStatus === 'COMPLETED' || molStatus === 'PROCESSING') {
      // HTTP 200 - Payment approved/successful
      responseCode = TransferResponseCode.APPROVED;
      message = TransferMessage.PAYMENT_APPROVED;
    } else if (molStatus === 'PENDING') {
      // HTTP 201 - Payment pending confirmation
      responseCode = TransferResponseCode.PENDING;
      message = TransferMessage.PAYMENT_PENDING;
    } else {
      // Unknown status - treat as error
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

  /**
   * Check if error code is a validation error (should return 400 instead of 422)
   */
  private isValidationErrorCode(errorCode: string): boolean {
    const validationErrorCodes = [
      'DIFE-4000', 'DIFE-4001', 'DIFE-5005', // Invalid key format
      'DIFE-0007', 'DIFE-5004', 'DIFE-5016', 'DIFE-5018', 'DIFE-5019', // Data validations
      'MOL-4007', 'MOL-4010', // Invalid account number
      'MOL-5005' // Data validation in MOL
    ];
    return validationErrorCodes.includes(errorCode);
  }

  /**
   * Obfuscate name for privacy
   * Example: "Juan Perez" -> "Jua* Per**"
   */
  private obfuscateName(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    return parts
      .map((part) => {
        if (part.length <= 3) {
          return part.charAt(0) + '*'.repeat(part.length - 1);
        }
        return part.substring(0, 3) + '*'.repeat(part.length - 3);
      })
      .join(' ');
  }

  /**
   * Obfuscate account number for privacy
   * Example: "1234567890" -> "****7890"
   */
  private obfuscateAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) {
      return accountNumber;
    }
    return '****' + accountNumber.slice(-4);
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
