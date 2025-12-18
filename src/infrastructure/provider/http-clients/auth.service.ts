import https from 'https';

import { AxiosError } from 'axios';
import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import NodeCache from 'node-cache';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { ExternalServicesConfigService } from '@config/external-services-config.service';
import { LoggingConfigService } from '@config/logging-config.service';
import { SecretsConfigService } from '@config/secrets-config.service';

import { ResilienceConfigService } from '../resilience-config.service';

import { HttpClientService } from './http-client.service';
import { AuthResponse } from './dto';

@Injectable()
export class AuthService {
  private readonly cache: NodeCache = new NodeCache();
  private readonly logger: ThLogger;
  private readonly isCacheEnabled: boolean = true;
  private readonly ENABLE_HTTP_HEADERS_LOG: boolean;

  constructor(
    private http: HttpClientService,
    private loggerService: ThLoggerService,
    private resilienceConfig: ResilienceConfigService,
    private externalServicesConfig: ExternalServicesConfigService,
    private loggingConfig: LoggingConfigService,
    private secretsConfig: SecretsConfigService
  ) {
    this.logger = this.loggerService.getLogger(AuthService.name, ThLoggerComponent.INFRASTRUCTURE);
    this.ENABLE_HTTP_HEADERS_LOG = this.loggingConfig.isHttpHeadersLogEnabled();
  }

  private loadCredentials(): {
    authClientId: string;
    authClientSecret: string;
    msslClientCert: string;
    msslClientKey: string;
  } {
    try {
      const authClientId = this.secretsConfig.getClientIdCredibanco();
      const authClientSecret = this.secretsConfig.getClientSecretCredibanco();
      const msslClientCert = this.secretsConfig.getMtlsClientCertCredibanco();
      const msslClientKey = this.secretsConfig.getMtlsClientKeyCredibanco();

      if (!authClientId || !authClientSecret) {
        throw new InternalServerErrorException('Auth client credentials configuration error');
      }

      if (!msslClientCert || !msslClientKey) {
        throw new InternalServerErrorException('Auth client certificates configuration error');
      }

      return {
        authClientId,
        authClientSecret,
        msslClientCert,
        msslClientKey
      };
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getToken(): Promise<string> {
    try {
      if (this.isCacheEnabled) {
        const cachedToken = this.cache.get<string>('auth_token');
        if (cachedToken) {
          this.logger.log('NETWORK_RESPONSE AUTH', {
            status: 200,
            statusText: 'OK',
            cached: true,
            responseData: {
              access_token: '***REDACTED***',
              token_type: 'Bearer',
              expires_in: undefined
            }
          });
          return cachedToken;
        }
      }

      const credentials = this.loadCredentials();
      const oauthBaseUrl = this.externalServicesConfig.getOAuthBaseUrl();
      if (!oauthBaseUrl) throw new InternalServerErrorException('Configuration error base URL missing');

      const url = `${oauthBaseUrl}/token?grant_type=client_credentials`;
      const basicAuth = Buffer.from(`${credentials.authClientId}:${credentials.authClientSecret}`).toString('base64');

      let httpsAgent: https.Agent | undefined = undefined;

      if (credentials.msslClientCert && credentials.msslClientKey) {
        httpsAgent = new https.Agent({
          cert: credentials.msslClientCert,
          key: credentials.msslClientKey,
          keepAlive: true
        });
      }

      const queryParams = '{}';
      const timeout = this.resilienceConfig.getOAuthTimeout();

      const requestHeaders = {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      const safeRequestHeaders = {
        Authorization: 'Basic ***REDACTED***',
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      const requestLog: Record<string, unknown> = {
        url,
        method: 'POST'
      };

      if (this.ENABLE_HTTP_HEADERS_LOG) {
        // When enabled, show headers in clear (without obfuscation)
        requestLog.headers = requestHeaders;
      } else {
        // When disabled, show headers but obfuscated
        requestLog.headers = safeRequestHeaders;
      }

      this.logger.log('NETWORK_REQUEST AUTH', requestLog);

      const res = await this.http.instance.post<AuthResponse>(url, queryParams, {
        httpsAgent,
        timeout,
        headers: requestHeaders
      });

      const safeResponseHeaders = res.headers ? this.redactSensitiveHeaders(res.headers) : {};

      this.logger.log('NETWORK_RESPONSE AUTH', {
        status: res.status,
        statusText: res.statusText,
        responseHeaders: safeResponseHeaders,
        responseData: {
          access_token: res.data?.access_token ? '***REDACTED***' : undefined,
          token_type: res.data?.token_type,
          expires_in: res.data?.expires_in
        }
      });

      if (!res.data?.access_token) {
        throw new UnauthorizedException('invalid token');
      }

      const token = res.data.access_token;
      const cacheTimeInSeconds = this.resilienceConfig.getOAuthCacheTtl();
      if (this.isCacheEnabled) {
        this.cache.set('auth_token', token, cacheTimeInSeconds);
      }

      return token;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  clearCache(): void {
    this.cache.flushAll();
  }

  private redactSensitiveHeaders(headers: Record<string, any> | undefined): Record<string, any> {
    if (!headers) {
      return {};
    }

    const sensitiveHeaders = ['authorization', 'x-api-key', 'x-auth-token', 'cookie', 'set-cookie'];
    const safeHeaders: Record<string, any> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.some((sensitive) => lowerKey.includes(sensitive))) {
        safeHeaders[key] = '***REDACTED***';
      } else {
        safeHeaders[key] = value as string;
      }
    }

    return safeHeaders;
  }

  private handleError(error: unknown): void {
    if (error instanceof UnauthorizedException || error instanceof InternalServerErrorException) {
      throw error;
    }

    if (error instanceof AxiosError) {
      const { status } = error.response;
      if (status === 401 || status === 403) {
        throw new UnauthorizedException('invalid credentials');
      }
      throw new InternalServerErrorException('connection error');
    }

    throw new InternalServerErrorException(
      `General error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
