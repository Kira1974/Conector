import { AxiosResponse } from 'axios';

export interface NetworkResponseLogOptions {
  transactionId?: string;
  retry?: boolean;
}

export interface NetworkRequestLogOptions {
  transactionId?: string;
  url: string;
  method: string;
  requestBody?: string;
  headers?: Record<string, string>;
  enableHttpHeadersLog?: boolean;
}

export function buildNetworkResponseLog<T>(
  response: AxiosResponse<T>,
  options: NetworkResponseLogOptions
): Record<string, unknown> {
  const log: Record<string, unknown> = {
    status: response.status,
    responseBody: JSON.stringify(response.data, null, 2)
  };

  if (options.transactionId) {
    log.transactionId = options.transactionId;
  }

  if (options.retry) {
    log.retry = true;
  }

  return log;
}

export function buildNetworkRequestLog(options: NetworkRequestLogOptions): Record<string, unknown> {
  const log: Record<string, unknown> = {
    url: options.url,
    method: options.method
  };

  if (options.transactionId) {
    log.transactionId = options.transactionId;
  }

  if (options.requestBody) {
    log.requestBody = options.requestBody;
  }

  if (options.enableHttpHeadersLog && options.headers) {
    log.headers = options.headers;
  }

  return log;
}
