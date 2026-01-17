import * as crypto from 'crypto';

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ThLogger,
  ThLoggerService,
  ThLoggerComponent,
  ThRuntimeContext,
  ThEventTypeBuilder,
  ThStandardResponse
} from 'themis';

interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, any>;
  body?: any;
}

interface HttpResponse {
  status(code: number): HttpResponse;
  json(data: any): void;
}

interface ErrorDetails {
  message: string;
  errorCode: string;
  httpStatus: number;
  correlationId?: string;
  validationErrors?: ValidationErrorNode[];
}

interface ValidationErrorNode {
  field?: string;
  constraints?: string[];
  children?: ValidationErrorNode[];
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger: ThLogger;

  constructor(private readonly loggerService: ThLoggerService) {
    this.logger = this.loggerService.getLogger(GlobalExceptionFilter.name, ThLoggerComponent.INFRASTRUCTURE);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<HttpRequest>();

    const correlationId = this.extractCorrelationId(request);

    if (this.isKeyResolutionError(exception)) {
      this.handleKeyResolutionError(exception as HttpException, response, request, correlationId);
      return;
    }

    const errorDetails = this.getErrorDetails(exception, correlationId);

    this.logError(exception, errorDetails, request, correlationId);

    const transactionId = this.extractTransactionId(request);
    const state = this.mapToResponseCode(errorDetails.errorCode);

    const responseData: Record<string, any> = {
      state
    };

    if (transactionId) {
      responseData.transactionId = transactionId;
    }

    const standardResponse: ThStandardResponse<typeof responseData> = {
      code: errorDetails.httpStatus,
      message: errorDetails.message,
      data: responseData
    };

    response.status(errorDetails.httpStatus).json(standardResponse);
  }

  private getErrorDetails(exception: unknown, correlationId?: string): ErrorDetails {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (
        (status as HttpStatus) === HttpStatus.BAD_REQUEST &&
        typeof response === 'object' &&
        response !== null &&
        'errors' in response
      ) {
        const validationResponse = response as { message?: string | string[]; errors?: ValidationErrorNode[] };
        const errors = validationResponse.errors || [];
        const flatErrors = this.flattenValidationErrors(errors);

        const baseMessage = Array.isArray(validationResponse.message)
          ? validationResponse.message.join(', ')
          : validationResponse.message || exception.message;

        const message = this.buildValidationErrorMessage(baseMessage, flatErrors);

        return {
          message,
          errorCode: this.getHttpErrorCode(status),
          httpStatus: status,
          correlationId,
          validationErrors: flatErrors
        };
      }

      const message =
        typeof response === 'string'
          ? response
          : (response as { message?: string | string[] })?.message || exception.message;

      return {
        message: Array.isArray(message) ? message.join(', ') : message,
        errorCode: this.getHttpErrorCode(status),
        httpStatus: status,
        correlationId
      };
    }

    if (this.isTimeoutError(exception)) {
      return {
        message: 'Request timeout - service took too long to respond',
        errorCode: 'TIMEOUT_ERROR',
        httpStatus: HttpStatus.REQUEST_TIMEOUT,
        correlationId
      };
    }

    if (this.isNetworkError(exception)) {
      return {
        message: 'Service temporarily unavailable',
        errorCode: 'SERVICE_UNAVAILABLE',
        httpStatus: HttpStatus.BAD_GATEWAY,
        correlationId
      };
    }

    return {
      message: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      correlationId
    };
  }

  private logError(exception: unknown, errorDetails: ErrorDetails, request: HttpRequest, correlationId?: string): void {
    let eventId = correlationId || this.generateEventId();

    try {
      const currentEventInfo = ThRuntimeContext.getEventInfo();
      if (!currentEventInfo?.eventId) {
        ThRuntimeContext.startTraceEvent(
          new ThEventTypeBuilder().setDomain('error').setAction('handle').setResult('error')
        );
        const newEventInfo = ThRuntimeContext.getEventInfo();
        if (newEventInfo?.eventId) {
          eventId = newEventInfo.eventId;
        }
      } else {
        eventId = currentEventInfo.eventId;
      }
    } catch {
      // Fallback to generated eventId if runtime context is unavailable
    }

    const logContext = {
      eventId,
      correlationId: correlationId || eventId,
      method: request.method,
      url: request.url,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      userAgent: request.headers['user-agent'],
      errorCode: errorDetails.errorCode,
      httpStatus: errorDetails.httpStatus
    };

    const baseMessage = errorDetails.message;

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      this.logger.warn('Client error occurred', {
        ...logContext,
        message: baseMessage
      });
      return;
    }

    this.logger.error('Server error occurred', {
      ...logContext,
      message: baseMessage,
      stack: exception instanceof Error ? exception.stack : undefined,
      exceptionType:
        exception && typeof exception === 'object' && 'constructor' in exception
          ? exception.constructor.name
          : 'Unknown'
    });
  }

  private generateEventId(): string {
    const randomBytes = crypto.randomBytes(4).toString('hex');
    return `${Date.now()}-${randomBytes}`;
  }

  private buildValidationErrorMessage(baseMessage: string, errors: ValidationErrorNode[]): string {
    const hasErrors = errors && errors.length > 0;
    if (!hasErrors) {
      return baseMessage;
    }

    const descriptions = errors
      .map((error) => {
        if (!error.field) {
          return '';
        }

        if (error.constraints && error.constraints.length > 0) {
          return `${error.field}: ${error.constraints.join(', ')}`;
        }

        return error.field;
      })
      .filter((description) => description.length > 0);

    if (descriptions.length === 0) {
      return baseMessage;
    }

    return `${baseMessage}: ${descriptions.join('; ')}`;
  }

  private getHttpErrorCode(status: number): string {
    switch (status as HttpStatus) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'AUTH_ERROR';
      case HttpStatus.FORBIDDEN:
        return 'PERMISSION_ERROR';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_ERROR';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_ERROR';
      case HttpStatus.BAD_GATEWAY:
        return 'EXTERNAL_SERVICE_ERROR';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return `HTTP_${status}`;
    }
  }

  private flattenValidationErrors(errors: ValidationErrorNode[], parentPath: string = ''): ValidationErrorNode[] {
    return errors.reduce<ValidationErrorNode[]>((accumulator, error) => {
      const fieldName = error.field || '';
      const currentPath = parentPath && fieldName ? `${parentPath}.${fieldName}` : fieldName || parentPath;
      const hasConstraints = !!error.constraints && error.constraints.length > 0;

      if (hasConstraints && currentPath) {
        accumulator.push({
          field: currentPath,
          constraints: error.constraints
        });
      }

      if (error.children && error.children.length > 0 && currentPath) {
        const childErrors = this.flattenValidationErrors(error.children, currentPath);
        accumulator.push(...childErrors);
      }

      return accumulator;
    }, []);
  }

  private extractCorrelationId(request: HttpRequest): string | undefined {
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['correlation-id'] as string) ||
      (request.body as { correlationId?: string })?.correlationId ||
      undefined
    );
  }

  private extractTransactionId(request: HttpRequest): string | undefined {
    const body = request.body as { transaction?: { id?: string } } | undefined;
    return body?.transaction?.id;
  }

  private isKeyResolutionError(exception: unknown): boolean {
    if (!(exception instanceof HttpException)) {
      return false;
    }

    const response = exception.getResponse();
    return typeof response === 'object' && response !== null && 'networkCode' in response;
  }

  private handleKeyResolutionError(
    exception: HttpException,
    response: HttpResponse,
    request: HttpRequest,
    correlationId?: string
  ): void {
    const exceptionResponse = exception.getResponse() as Record<string, any>;
    const httpStatus = exception.getStatus();
    const message = String(exceptionResponse.message || 'Key resolution error');

    this.logError(
      exception,
      {
        message,
        errorCode: 'KEY_RESOLUTION_ERROR',
        httpStatus,
        correlationId
      },
      request,
      correlationId
    );
    const state = (exceptionResponse.responseCode as string | undefined) || 'ERROR';

    const responseData: Record<string, string> = {
      state,
      ...(exceptionResponse.networkCode && { networkCode: exceptionResponse.networkCode as string }),
      ...(exceptionResponse.networkMessage && { networkMessage: exceptionResponse.networkMessage as string }),
      ...(exceptionResponse.key && { key: exceptionResponse.key as string }),
      ...(exceptionResponse.keyType && { keyType: exceptionResponse.keyType as string })
    };

    const standardResponse: ThStandardResponse<typeof responseData> = {
      code: httpStatus,
      message,
      data: responseData
    };

    response.status(httpStatus).json(standardResponse);
  }

  private isTimeoutError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;

    const message = exception.message.toLowerCase();
    return message.includes('timeout') || message.includes('etimedout') || exception.name === 'TimeoutError';
  }

  private isNetworkError(exception: unknown): boolean {
    if (!(exception instanceof Error)) return false;

    const message = exception.message.toLowerCase();
    return (
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('econnreset') ||
      message.includes('network') ||
      exception.name === 'NetworkError'
    );
  }

  private mapToResponseCode(errorCode: string): string {
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        return 'VALIDATION_FAILED';
      case 'AUTH_ERROR':
      case 'PERMISSION_ERROR':
      case 'RATE_LIMIT_ERROR':
        return 'REJECTED_BY_PROVIDER';
      case 'NOT_FOUND':
        return 'ERROR';
      case 'TIMEOUT_ERROR':
      case 'EXTERNAL_SERVICE_ERROR':
      case 'SERVICE_UNAVAILABLE':
      case 'INTERNAL_ERROR':
      default:
        return 'ERROR';
    }
  }
}
