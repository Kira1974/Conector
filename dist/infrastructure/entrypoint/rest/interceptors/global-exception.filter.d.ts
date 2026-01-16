import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { ThLoggerService } from 'themis';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly loggerService;
    private readonly logger;
    constructor(loggerService: ThLoggerService);
    catch(exception: unknown, host: ArgumentsHost): void;
    private getErrorDetails;
    private logError;
    private generateEventId;
    private buildValidationErrorMessage;
    private getHttpErrorCode;
    private flattenValidationErrors;
    private extractCorrelationId;
    private extractTransactionId;
    private isKeyResolutionError;
    private handleKeyResolutionError;
    private isTimeoutError;
    private isNetworkError;
    private mapToResponseCode;
}
