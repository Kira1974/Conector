import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base Business Exception
 * All business-related exceptions should extend this class
 */
export abstract class BusinessException extends HttpException {
  public readonly errorCode: string;
  public readonly correlationId?: string;

  constructor(
    message: string,
    errorCode: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    correlationId?: string
  ) {
    super(message, httpStatus);
    this.errorCode = errorCode;
    this.correlationId = correlationId;
  }
}

/**
 * Timeout Exception
 * Thrown when external service calls exceed timeout limits
 */
export class TimeoutException extends BusinessException {
  constructor(service: string, timeout: number, correlationId?: string) {
    super(
      `Service ${service} timed out after ${timeout}ms`,
      'TIMEOUT_ERROR',
      HttpStatus.REQUEST_TIMEOUT,
      correlationId
    );
  }
}

/**
 * External Service Exception
 * Thrown when external services return errors or are unavailable
 */
export class ExternalServiceException extends BusinessException {
  public readonly serviceName: string;

  constructor(
    serviceName: string,
    message: string,
    errorCode: string = 'EXTERNAL_SERVICE_ERROR',
    correlationId?: string
  ) {
    super(`External service error in ${serviceName}: ${message}`, errorCode, HttpStatus.BAD_GATEWAY, correlationId);
    this.serviceName = serviceName;
  }
}

/**
 * Validation Exception
 * Thrown when business validation rules fail
 */
export class ValidationException extends BusinessException {
  public readonly field?: string;

  constructor(message: string, field?: string, correlationId?: string) {
    super(message, 'VALIDATION_ERROR', HttpStatus.BAD_REQUEST, correlationId);
    this.field = field;
  }
}

/**
 * Key Resolution Exception
 * Thrown when account key resolution fails
 */
export class KeyResolutionException extends BusinessException {
  constructor(key: string, reason: string, correlationId?: string) {
    super(
      `Key resolution failed for key ${key}: ${reason}`,
      'KEY_RESOLUTION_ERROR',
      HttpStatus.UNPROCESSABLE_ENTITY,
      correlationId
    );
  }
}

/**
 * Payment Processing Exception
 * Thrown when payment creation or processing fails
 */
export class PaymentProcessingException extends BusinessException {
  constructor(reason: string, correlationId?: string) {
    super(
      `Payment processing failed: ${reason}`,
      'PAYMENT_PROCESSING_ERROR',
      HttpStatus.UNPROCESSABLE_ENTITY,
      correlationId
    );
  }
}
