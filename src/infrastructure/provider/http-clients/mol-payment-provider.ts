import { URLSearchParams } from 'url';

import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';
import { AxiosResponse } from 'axios';

import { ExternalServiceException, PaymentProcessingException } from '@core/exception/custom.exceptions';
import { IMolPaymentProvider } from '@core/provider';
import { ResilienceConfigService, formatTimestampWithoutZ } from '@core/util';
import { AdditionalDataKey, KeyResolutionResponse } from '@core/model';

import { TransferRequestDto, TransferResponseDto, TransferResponseCode } from '../../entrypoint/dto';

import {
  CredibancoApiResponse,
  MolPaymentRequestDto,
  MolPaymentQueryRequestDto,
  MolPaymentQueryResponseDto
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
    private readonly resilienceConfig: ResilienceConfigService
  ) {
    this.logger = this.loggerService.getLogger(MolPaymentProvider.name, ThLoggerComponent.INFRASTRUCTURE);
    this.ENABLE_HTTP_HEADERS_LOG = process.env.ENABLE_HTTP_HEADERS_LOG === 'true';
  }

  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('payment').setAction('create'),
    tags: ['payment', 'mol', 'create']
  })
  async createPayment(request: TransferRequestDto, keyResolution: KeyResolutionResponse): Promise<TransferResponseDto> {
    try {
      const baseUrl = process.env.PAYMENT_BASE;
      const url = `${baseUrl}/v1/payment`;

      const dto: MolPaymentRequestDto = this.toPaymentRequestDto(request, keyResolution);

      this.logger.log('Creating MOL payment', {
        internalId: request.transactionId,
        value: request.transaction.amount.value,
        baseUrl
      });

      const headers = await this.buildHeaders(baseUrl);
      const timeout = this.resilienceConfig.getMolTimeout();

      const requestLog: Record<string, unknown> = {
        url,
        method: 'POST',
        requestBody: JSON.stringify(dto, null, 2),
        eventId: request.transactionId,
        correlationId: request.transactionId,
        internalId: request.transactionId
      };

      if (this.ENABLE_HTTP_HEADERS_LOG) {
        requestLog.headers = headers;
      }

      this.logger.log('MOL Request JSON', requestLog);

      const response = await this.http.instance.post<CredibancoApiResponse>(url, dto, {
        headers,
        timeout
      });

      this.logger.log('MOL Response JSON', {
        status: response.status,
        responseBody: JSON.stringify(response.data, null, 2),
        eventId: request.transactionId,
        correlationId: request.transactionId,
        internalId: request.transactionId
      });

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

      const baseUrl = process.env.PAYMENT_BASE;
      const url = `${baseUrl}/v1/payments`;

      const queryParams = this.buildQueryParams(request);
      const queryString = new URLSearchParams(queryParams).toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      this.logger.log('Querying MOL payment status', {
        queryParams,
        baseUrl,
        timeout: timeout || this.resilienceConfig.getMolTimeout()
      });

      const headers = await this.buildHeaders(baseUrl);
      const requestTimeout = timeout || this.resilienceConfig.getMolTimeout();

      const requestLog: Record<string, unknown> = {
        url: fullUrl,
        method: 'GET',
        eventId: request.internal_id || request.end_to_end_id || 'query-payment-status',
        correlationId: request.internal_id || request.end_to_end_id || 'query-payment-status'
      };

      if (this.ENABLE_HTTP_HEADERS_LOG) {
        requestLog.headers = headers;
      }

      this.logger.log('MOL Query Request JSON', requestLog);

      const response = await this.http.instance.get<MolPaymentQueryResponseDto>(url, {
        headers,
        params: queryParams,
        timeout: requestTimeout
      });

      this.logger.log('MOL Query Response JSON', {
        url: fullUrl,
        method: 'GET',
        status: response.status,
        responseBody: JSON.stringify(response.data, null, 2),
        eventId: request.internal_id || request.end_to_end_id || 'query-payment-status',
        correlationId: request.internal_id || request.end_to_end_id || 'query-payment-status'
      });

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
    response: AxiosResponse<CredibancoApiResponse>,
    request: TransferRequestDto,
    keyResolution: KeyResolutionResponse
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
      const errorDescription =
        response.data?.error?.description ||
        response.data?.errors?.map((e) => e.description).join(', ') ||
        'Unknown API error';

      this.logger.error('MOL API returned error status', {
        internalId: request.transactionId,
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

    const difeExecutionId = keyResolution.executionId || '';
    const molExecutionId = response.data.execution_id || '';

    const isSuccess =
      response.data.status === 'PROCESSING' ||
      response.data.status === 'COMPLETED' ||
      response.data.status === 'PENDING';

    return {
      transactionId: request.transactionId,
      responseCode: isSuccess ? TransferResponseCode.APPROVED : TransferResponseCode.ERROR,
      message: isSuccess ? 'Payment initiated successfully' : 'Payment error',
      externalTransactionId: response.data.end_to_end_id,
      additionalData: {
        [AdditionalDataKey.END_TO_END]: response.data.end_to_end_id,
        [AdditionalDataKey.DIFE_EXECUTION_ID]: difeExecutionId,
        [AdditionalDataKey.MOL_EXECUTION_ID]: molExecutionId
      }
    };
  }

  private toPaymentRequestDto(request: TransferRequestDto, keyResolution: KeyResolutionResponse): MolPaymentRequestDto {
    const currency = request.transaction.amount.currency;
    const resolvedKey = keyResolution.resolvedKey;
    if (!resolvedKey) {
      throw new Error('Key resolution data is missing');
    }
    const payerConfiguration = this.getPayerConfigurationFromEnv();
    const creditorDifeIdentificationType = this.mapIdentificationTypeToMol(resolvedKey.person.identificationType || '');
    const now = formatTimestampWithoutZ();
    const keyType = resolvedKey.keyType || 'OTHER';
    return {
      additional_informations: request.transaction.description,
      billing_responsible: 'DEBT',
      initiation_type: 'KEY',
      creditor: {
        identification: {
          type: creditorDifeIdentificationType,
          value: resolvedKey.person.identificationNumber
        },
        key: {
          type: this.mapKeyTypeToMol(keyType),
          value: resolvedKey.keyValue
        },
        name:
          [resolvedKey.person.firstName, resolvedKey.person.lastName].filter(Boolean).join(' ') ||
          resolvedKey.person.legalCompanyName ||
          '',
        participant: {
          id: resolvedKey.participant.nit || '',
          spbvi: resolvedKey.participant.spbvi || ''
        },
        payment_method: {
          currency,
          type: this.mapPaymentMethodTypeToMol(resolvedKey.paymentMethod.type || ''),
          value: resolvedKey.paymentMethod.number || ''
        }
      },
      internal_id: keyResolution.correlationId || '',
      key_resolution_id: keyResolution.traceId || '',
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
    const identificationType = process.env.MOL_PAYER_IDENTIFICATION_TYPE;
    const identificationValue = process.env.MOL_PAYER_IDENTIFICATION_VALUE;
    const name = process.env.MOL_PAYER_NAME;
    const paymentMethodType = process.env.MOL_PAYER_PAYMENT_METHOD_TYPE;
    const paymentMethodValue = process.env.MOL_PAYER_PAYMENT_METHOD_VALUE;
    const paymentMethodCurrency = process.env.MOL_PAYER_PAYMENT_METHOD_CURRENCY;
    if (
      !identificationType ||
      !identificationValue ||
      !name ||
      !paymentMethodType ||
      !paymentMethodValue ||
      !paymentMethodCurrency
    ) {
      throw new Error('MOL payer configuration environment variables are not fully configured');
    }
    return {
      identificationType,
      identificationValue,
      name,
      paymentMethodType,
      paymentMethodValue,
      paymentMethodCurrency
    };
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
}
