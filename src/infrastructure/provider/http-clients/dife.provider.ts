import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { KeyResolutionRequest } from '@core/model';
import { KeyResolutionException, ExternalServiceException } from '@core/exception/custom.exceptions';
import { KeyTypeDife } from '@core/constant';
import { formatTimestampWithoutZ } from '@core/util';
import { ExternalServicesConfigService } from '@config/external-services-config.service';
import { LoggingConfigService } from '@config/logging-config.service';

import { ResilienceConfigService } from '../resilience-config.service';


import { DifeKeyRequestDto, DifeKeyResponseDto } from './dto';
import { buildNetworkRequestLog, buildNetworkResponseLog } from '../util/network-log.util';

import { AuthService, HttpClientService } from './';

/**
 * Key Resolution Provider - HTTP client for account key resolution
 * Handles communication with key resolution service
 */
@Injectable()
export class DifeProvider {
  private readonly logger: ThLogger;
  private readonly ENABLE_HTTP_HEADERS_LOG: boolean;

  constructor(
    private readonly http: HttpClientService,
    private readonly auth: AuthService,
    private readonly loggerService: ThLoggerService,
    private readonly resilienceConfig: ResilienceConfigService,
    private readonly externalServicesConfig: ExternalServicesConfigService,
    private readonly loggingConfig: LoggingConfigService
  ) {
    this.logger = this.loggerService.getLogger(DifeProvider.name, ThLoggerComponent.INFRASTRUCTURE);
    this.ENABLE_HTTP_HEADERS_LOG = this.loggingConfig.isHttpHeadersLogEnabled();
  }

  /**
   * Resolve key with DIFE API
   * @param request Domain model for key resolution
   * @returns Domain model response
   */
  async resolveKey(request: KeyResolutionRequest): Promise<DifeKeyResponseDto> {
    try {
      const c110Timestamp = formatTimestampWithoutZ();

      const baseUrl = this.externalServicesConfig.getDifeBaseUrl();

      const url = `${baseUrl}/v1/key/resolve`;

      const c120Timestamp = formatTimestampWithoutZ();

      const requestBody: DifeKeyRequestDto = {
        correlation_id: request.correlationId,
        key: {
          type: (request.keyType || 'O') as KeyTypeDife,
          value: request.key
        },
        time_marks: {
          C110: c110Timestamp,
          C120: c120Timestamp
        }
      };

      const difeEventId = request.transactionId || request.correlationId;
      const difeTraceId = request.transactionId || request.correlationId;
      const difeCorrelationId = request.correlationId;

      let token = await this.auth.getToken();
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const requestLog = buildNetworkRequestLog({
        url,
        method: 'POST',
        requestBody: JSON.stringify(requestBody, null, 2),
        eventId: difeEventId,
        traceId: difeTraceId,
        correlationId: difeCorrelationId,
        transactionId: request.transactionId,
        headers,
        enableHttpHeadersLog: this.ENABLE_HTTP_HEADERS_LOG
      });

      this.logger.log('NETWORK_REQUEST DIFE', requestLog);

      const timeout = this.resilienceConfig.getDifeTimeout();
      let response = await this.http.instance.post<DifeKeyResponseDto>(url, requestBody, {
        headers,
        timeout
      });

      this.logNetworkResponse(response, {
        eventId: difeEventId,
        traceId: difeTraceId,
        correlationId: difeCorrelationId,
        transactionId: request.transactionId
      });

      if (response.status === 401 || response.status === 403) {
        this.logger.warn('DIFE request failed with authentication error, clearing token cache and retrying', {
          eventId: difeEventId,
          traceId: difeTraceId,
          correlationId: difeCorrelationId,
          transactionId: request.transactionId,
          status: response.status
        });

        this.auth.clearCache();
        token = await this.auth.getToken();
        headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        };

        response = await this.http.instance.post<DifeKeyResponseDto>(url, requestBody, {
          headers,
          timeout
        });

        this.logNetworkResponse(response, {
          eventId: difeEventId,
          traceId: difeTraceId,
          correlationId: difeCorrelationId,
          transactionId: request.transactionId,
          retry: true
        });
      }

      // Convert provider DTO response to domain model
      if (!response.data) {
        this.logger.error('DIFE returned empty response', {
          correlationId: request.correlationId,
          key: request.key,
          status: response.status,
          headers: response.headers
        });
        throw new KeyResolutionException(
          request.key,
          'DIFE: Key resolution returned empty response',
          request.correlationId
        );
      }

      const responseDto: DifeKeyResponseDto = response.data;

      // Handle new error structure from DIFE API
      if (responseDto.status === 'ERROR' && responseDto.errors && responseDto.errors.length > 0) {
        const errorInfo = responseDto.errors[0];
        this.logger.error('DIFE API returned error response', {
          correlationId: request.correlationId,
          errorCode: errorInfo?.code,
          errorDescription: errorInfo?.description,
          executionId: responseDto.execution_id
        });
      }

      return responseDto;
    } catch (error: unknown) {
      this.logger.error('Key resolution failed', {
        correlationId: request.correlationId,
        key: request.key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof KeyResolutionException || error instanceof ExternalServiceException) {
        throw error;
      }

      throw new KeyResolutionException(
        request.key,
        error instanceof Error ? error.message : 'Unknown error occurred',
        request.correlationId
      );
    }
  }

  /**
   * Log network response immediately after receiving it
   */
  private logNetworkResponse(
    response: AxiosResponse<DifeKeyResponseDto>,
    options: {
      eventId: string;
      traceId: string;
      correlationId: string;
      transactionId?: string;
      retry?: boolean;
    }
  ): void {
    const responseLog = buildNetworkResponseLog(response, options);

    if (response.data?.execution_id) {
      responseLog.externalTransactionId = response.data.execution_id;
    }

    this.logger.log('NETWORK_RESPONSE DIFE', responseLog);
  }

  /**
   * Get default key type - always 'O' (Alphanumeric Identifier)
   */
  private getDefaultKeyType(): string {
    return 'O';
  }
}
