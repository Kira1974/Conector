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
    requestBody?: string;
    headers?: Record<string, string>;
    enableHttpHeadersLog?: boolean;
}
export declare function buildNetworkResponseLog<T>(response: AxiosResponse<T>, options: NetworkResponseLogOptions): Record<string, unknown>;
export declare function buildNetworkRequestLog(options: NetworkRequestLogOptions): Record<string, unknown>;
