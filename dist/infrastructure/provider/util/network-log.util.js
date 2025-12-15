"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNetworkRequestLog = exports.buildNetworkResponseLog = void 0;
function buildNetworkResponseLog(response, options) {
    const log = {
        status: response.status,
        responseBody: JSON.stringify(response.data, null, 2),
        eventId: options.eventId,
        traceId: options.traceId,
        correlationId: options.correlationId
    };
    if (options.transactionId) {
        log.transactionId = options.transactionId;
    }
    if (options.retry) {
        log.retry = true;
    }
    return log;
}
exports.buildNetworkResponseLog = buildNetworkResponseLog;
function buildNetworkRequestLog(options) {
    const log = {
        url: options.url,
        method: options.method,
        eventId: options.eventId,
        traceId: options.traceId,
        correlationId: options.correlationId
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
exports.buildNetworkRequestLog = buildNetworkRequestLog;
//# sourceMappingURL=network-log.util.js.map