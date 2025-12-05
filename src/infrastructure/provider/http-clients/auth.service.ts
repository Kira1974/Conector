import https from 'https';

import { AxiosError } from 'axios';
import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import NodeCache from 'node-cache';
import { ThLogger, ThLoggerService, ThLoggerComponent } from 'themis';

import { ResilienceConfigService } from '@core/util';

import { HttpClientService } from './http-client.service';

export interface AuthResponse {
  access_token: string;
  expires_in?: number;
  token_type?: string;
}

@Injectable()
export class AuthService {
  private cache = new NodeCache();
  private logger: ThLogger;
  constructor(
    private http: HttpClientService,
    private loggerService: ThLoggerService,
    private resilienceConfig: ResilienceConfigService
  ) {
    this.logger = this.loggerService.getLogger(AuthService.name, ThLoggerComponent.INFRASTRUCTURE);
  }

  private loadCredentials(): {
    authClientId: string;
    authClientSecret: string;
    msslClientCert: string;
    msslClientKey: string;
  } {
    try {
      const authClientId = process.env.CLIENT_ID_CREDIBANCO;
      const authClientSecret = process.env.CLIENT_SECRET_CREDIBANCO;
      const msslClientCert = process.env.MTLS_CLIENT_CERT_CREDIBANCO;
      const msslClientKey = process.env.MTLS_CLIENT_KEY_CREDIBANCO;

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
      const cached = this.cache.get<string>('auth_token');
      if (cached) {
        return cached;
      }

      const credentials = this.loadCredentials();
      if (!process.env.OAUTH_BASE) throw new InternalServerErrorException('Configuration error base URL missing');

      const url = `${process.env.OAUTH_BASE}/token?grant_type=client_credentials`;
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

      this.logger.debug('Requesting OAuth access token', {
        url,
        timeout,
        hasMtls: Boolean(httpsAgent)
      });

      const res = await this.http.instance.post<AuthResponse>(url, queryParams, {
        httpsAgent,
        timeout,
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!res.data?.access_token) {
        throw new UnauthorizedException('invalid token');
      }

      const token = res.data.access_token;
      const timeTokenExpires = Math.max(30, (res.data.expires_in || 3600) - 60);
      this.cache.set('auth_token', token, timeTokenExpires);

      return token;
    } catch (error: unknown) {
      this.handleError(error);
    }
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
