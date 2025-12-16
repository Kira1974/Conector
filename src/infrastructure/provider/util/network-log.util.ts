import { AxiosResponse } from 'axios';

export interface NetworkResponseLogOptions {
  eventId: string;
  traceId: string;
  correlationId: string;
  transactionId?: string;
  retry?: boolean;
}

export interface NetworkRequestLogOptions {
  eventId: string;
  traceId: string;
  correlationId: string;
  transactionId?: string;
  url: string;
  method: string;
  requestBody?: unknown; //can be object
  headers?: Record<string, string>;
  enableHttpHeadersLog?: boolean;
}

export function buildNetworkResponseLog<T>(
  response: AxiosResponse<T>,
  options: NetworkResponseLogOptions
): Record<string, unknown> {
  const log: Record<string, unknown> = {
    status: response.status,
    responseBody: response.data, 
    eventId: options.eventId,
    traceId: options.traceId,
    correlationId: options.correlationId
  };

  // Only add transactionId if it's provided and different from eventId
  if (options.transactionId && options.transactionId !== options.eventId) {
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
    method: options.method,
    eventId: options.eventId,
    traceId: options.traceId,
    correlationId: options.correlationId
  };

  // Only add transactionId if it's provided and different from eventId
  if (options.transactionId && options.transactionId !== options.eventId) {
    log.transactionId = options.transactionId;
  }

  if (options.requestBody !== undefined) {
    if (typeof options.requestBody === 'string') {
      try {
        log.requestBody = JSON.parse(options.requestBody);
      } catch {
        log.requestBody = options.requestBody;
      }
    } else {
      log.requestBody = options.requestBody;
    }
  }

  if (options.enableHttpHeadersLog && options.headers) {
    log.headers = options.headers;
  }

  return log;
}
