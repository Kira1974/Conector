import https from 'https';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { TimeoutException, ExternalServiceException } from '@core/exception/custom.exceptions';
import { SecretsConfigService } from '@config/secrets-config.service';

import { ResilienceConfigService } from '../resilience-config.service';

@Injectable()
export class HttpClientService {
  private client: AxiosInstance;
  private logger: ThLogger;

  constructor(
    private configService: ConfigService,
    private loggerService: ThLoggerService,
    private resilienceConfig: ResilienceConfigService,
    private secretsConfig: SecretsConfigService
  ) {
    this.logger = this.loggerService.getLogger(HttpClientService.name, ThLoggerComponent.INFRASTRUCTURE);

    const opts = this.createMtlsOptions();
    const agent = new https.Agent({ ...opts, keepAlive: true });

    this.client = axios.create({
      httpsAgent: agent,
      // No global timeout - each request manages its own timeout
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    this.setupInterceptors();
  }

  /**
   * Create mTLS options from configuration
   */
  private createMtlsOptions(): https.AgentOptions {
    const opts: https.AgentOptions = {};
    try {
      const clientCert = this.secretsConfig.getMtlsClientCertCredibanco();
      const clientKey = this.secretsConfig.getMtlsClientKeyCredibanco();

      if (clientCert && clientKey) {
        opts.cert = clientCert;
        opts.key = clientKey;
      }
    } catch {
      this.logger.warn('mTLS certs not found — running without mTLS (dev).', {
        correlation_id: 'http-client-service'
      });
    }
    return opts;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        this.handleHttpError(error);
        const message = error instanceof Error ? error.message : 'HTTP request failed';
        return Promise.reject(new Error(message));
      }
    );
  }

  get instance(): AxiosInstance {
    return this.client;
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  async request<T>(config: AxiosRequestConfig, correlationId?: string): Promise<T> {
    try {
      if (correlationId) {
        config.headers = {
          ...config.headers,
          'x-correlation-id': correlationId
        } as AxiosRequestConfig['headers'];
      }

      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.transformError(error, config.url || 'unknown', correlationId);
    }
  }

  /**
   * Handle HTTP errors and transform them to business exceptions
   */
  private handleHttpError(error: unknown): void {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        this.logger.warn('HTTP request timeout', {
          url: error.config?.url,
          timeout: error.config?.timeout,
          method: error.config?.method
        });
      } else if (error.response) {
        this.logger.warn('HTTP error response', {
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.config?.url,
          data: error.response.data
        });
      } else {
        this.logger.error('HTTP request failed', {
          message: error.message,
          url: error.config?.url,
          code: error.code
        });
      }
    } else if (error instanceof Error) {
      this.logger.error('HTTP request failed', {
        message: error.message,
        url: 'unknown',
        code: 'UNKNOWN'
      });
    } else {
      this.logger.error('HTTP request failed with unknown error', {
        error: JSON.stringify(error)
      });
    }
  }

  /**
   * Transform axios errors to business exceptions
   */
  private transformError(error: unknown, url: string, correlationId?: string): Error {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      return this.handleAxiosError(error, url, correlationId);
    } else if (error instanceof Error) {
      return this.handleGenericError(error, url, correlationId);
    } else {
      return this.handleUnknownError(url, correlationId);
    }
  }

  private handleAxiosError(error: AxiosError<{ message?: string }>, url: string, correlationId?: string): Error {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new TimeoutException(url, 0, correlationId); // Timeout handled per request
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new ExternalServiceException(url, 'Service unavailable', 'CONNECTION_ERROR', correlationId);
    }

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      return new ExternalServiceException(url, `HTTP ${status}: ${message}`, `HTTP_${status}`, correlationId);
    }

    return new ExternalServiceException(url, error.message || 'Unknown Axios error', 'AXIOS_ERROR', correlationId);
  }

  private handleGenericError(error: Error, url: string, correlationId?: string): Error {
    return new ExternalServiceException(url, error.message || 'Unknown error', 'UNKNOWN_ERROR', correlationId);
  }

  private handleUnknownError(url: string, correlationId?: string): Error {
    return new ExternalServiceException(url, 'Unknown error occurred', 'UNKNOWN_ERROR', correlationId);
  }
}
