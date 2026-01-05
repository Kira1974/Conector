import { HttpException, HttpStatus } from '@nestjs/common';
export declare abstract class BusinessException extends HttpException {
    readonly errorCode: string;
    readonly correlationId?: string;
    constructor(message: string, errorCode: string, httpStatus?: HttpStatus, correlationId?: string);
}
export declare class TimeoutException extends BusinessException {
    constructor(service: string, timeout: number, correlationId?: string);
}
export declare class ExternalServiceException extends BusinessException {
    readonly serviceName: string;
    constructor(serviceName: string, message: string, errorCode?: string, correlationId?: string);
}
export declare class ValidationException extends BusinessException {
    readonly field?: string;
    constructor(message: string, field?: string, correlationId?: string);
}
export declare class KeyResolutionException extends BusinessException {
    constructor(key: string, reason: string, correlationId?: string);
}
export declare class PaymentProcessingException extends BusinessException {
    constructor(reason: string, correlationId?: string);
}
