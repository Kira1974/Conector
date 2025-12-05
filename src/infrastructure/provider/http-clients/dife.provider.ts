import { Injectable } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { KeyResolutionException, ExternalServiceException } from '@core/exception/custom.exceptions';
import { KeyTypeDife } from '@core/constant';
import { ResilienceConfigService, formatTimestampWithoutZ } from '@core/util';

import { KeyResolutionMapper } from '../mapper';

import { ResolveKeyRequestDto, ResolveKeyResponseDto } from './dto';

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
    private readonly resilienceConfig: ResilienceConfigService
  ) {
    this.logger = this.loggerService.getLogger(DifeProvider.name, ThLoggerComponent.INFRASTRUCTURE);
    this.ENABLE_HTTP_HEADERS_LOG = process.env.ENABLE_HTTP_HEADERS_LOG === 'true';
  }

  /**
   * Resolve key with DIFE API
   * @param request Domain model for key resolution
   * @returns Domain model response
   */
  async resolveKey(request: KeyResolutionRequest): Promise<KeyResolutionResponse> {
    try {
      const c110Timestamp = formatTimestampWithoutZ();

      const baseUrl = process.env.KEYMGMT_BASE;

      const url = `${baseUrl}/v1/key/resolve`;

      this.logger.log('Resolving DIFE key', {
        correlationId: request.correlationId,
        keyType: request.keyType || 'O',
        keyValue: request.key,
        baseUrl,
        url,
        c110Timestamp
      });

      const c120Timestamp = formatTimestampWithoutZ();

      const requestBody: ResolveKeyRequestDto = {
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

      // Log request JSON
      const token = await this.auth.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const requestLog: Record<string, unknown> = {
        url,
        method: 'POST',
        requestBody: JSON.stringify(requestBody, null, 2),
        eventId: request.correlationId,
        correlationId: request.correlationId
      };

      if (this.ENABLE_HTTP_HEADERS_LOG) {
        requestLog.headers = headers;
      }

      this.logger.log('DIFE Request JSON', requestLog);

      const timeout = this.resilienceConfig.getDifeTimeout();
      const response = await this.http.instance.post<ResolveKeyResponseDto>(url, requestBody, {
        headers,
        timeout
      });

      // Log response JSON
      this.logger.log('DIFE Response JSON', {
        status: response.status,
        responseBody: JSON.stringify(response.data, null, 2),
        eventId: request.correlationId,
        correlationId: request.correlationId
      });

      // Handle new error structure from DIFE API
      if (response.data?.status === 'ERROR' && response.data?.errors?.length > 0) {
        const errorInfo = response.data.errors[0];
        this.logger.error('DIFE API returned error response', {
          correlationId: request.correlationId,
          errorCode: errorInfo.code,
          errorDescription: errorInfo.description,
          executionId: response.data.execution_id
        });

        throw new ExternalServiceException(
          url,
          `DIFE API error: ${errorInfo.description} (${errorInfo.code})`,
          errorInfo.code
        );
      }

      this.logger.log('DIFE key resolved successfully', {
        correlationId: request.correlationId,
        responseStatus: response.status,
        executionId: response.data.execution_id
      });

      // Convert provider DTO response to domain model
      const responseDto: ResolveKeyResponseDto = response.data;

      const domainResult = KeyResolutionMapper.toDomain(responseDto);

      return domainResult;
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
   * Get default key type - always 'O' (Alphanumeric Identifier)
   */
  private getDefaultKeyType(): string {
    return 'O';
  }
}
