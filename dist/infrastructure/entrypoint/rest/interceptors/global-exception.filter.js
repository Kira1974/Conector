"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const crypto = __importStar(require("crypto"));
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor(loggerService) {
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(GlobalExceptionFilter_1.name, themis_1.ThLoggerComponent.INFRASTRUCTURE);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const correlationId = this.extractCorrelationId(request);
        if (this.isKeyResolutionError(exception)) {
            this.handleKeyResolutionError(exception, response, request, correlationId);
            return;
        }
        const errorDetails = this.getErrorDetails(exception, correlationId);
        this.logError(exception, errorDetails, request, correlationId);
        const transactionId = this.extractTransactionId(request);
        const state = this.mapToResponseCode(errorDetails.errorCode);
        const responseData = {
            state
        };
        if (transactionId) {
            responseData.transactionId = transactionId;
        }
        const standardResponse = {
            code: errorDetails.httpStatus,
            message: errorDetails.message,
            data: responseData
        };
        response.status(errorDetails.httpStatus).json(standardResponse);
    }
    getErrorDetails(exception, correlationId) {
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const response = exception.getResponse();
            if (status === common_1.HttpStatus.BAD_REQUEST &&
                typeof response === 'object' &&
                response !== null &&
                'errors' in response) {
                const validationResponse = response;
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
            const message = typeof response === 'string'
                ? response
                : response?.message || exception.message;
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
                httpStatus: common_1.HttpStatus.REQUEST_TIMEOUT,
                correlationId
            };
        }
        if (this.isNetworkError(exception)) {
            return {
                message: 'Service temporarily unavailable',
                errorCode: 'SERVICE_UNAVAILABLE',
                httpStatus: common_1.HttpStatus.BAD_GATEWAY,
                correlationId
            };
        }
        return {
            message: 'Internal server error',
            errorCode: 'INTERNAL_ERROR',
            httpStatus: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            correlationId
        };
    }
    logError(exception, errorDetails, request, correlationId) {
        let eventId = correlationId || this.generateEventId();
        try {
            const currentEventInfo = themis_1.ThRuntimeContext.getEventInfo();
            if (!currentEventInfo?.eventId) {
                themis_1.ThRuntimeContext.startTraceEvent(new themis_1.ThEventTypeBuilder().setDomain('error').setAction('handle').setResult('error'));
                const newEventInfo = themis_1.ThRuntimeContext.getEventInfo();
                if (newEventInfo?.eventId) {
                    eventId = newEventInfo.eventId;
                }
            }
            else {
                eventId = currentEventInfo.eventId;
            }
        }
        catch {
        }
        const logContext = {
            eventId,
            correlationId: correlationId || eventId,
            method: request.method,
            url: request.url,
            userAgent: request.headers['user-agent'],
            errorCode: errorDetails.errorCode,
            httpStatus: errorDetails.httpStatus
        };
        const baseMessage = errorDetails.message;
        if (exception instanceof common_1.HttpException && exception.getStatus() < 500) {
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
            exceptionType: exception && typeof exception === 'object' && 'constructor' in exception
                ? exception.constructor.name
                : 'Unknown'
        });
    }
    generateEventId() {
        const randomBytes = crypto.randomBytes(4).toString('hex');
        return `${Date.now()}-${randomBytes}`;
    }
    buildValidationErrorMessage(baseMessage, errors) {
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
    getHttpErrorCode(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return 'VALIDATION_ERROR';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'AUTH_ERROR';
            case common_1.HttpStatus.FORBIDDEN:
                return 'PERMISSION_ERROR';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case common_1.HttpStatus.TOO_MANY_REQUESTS:
                return 'RATE_LIMIT_ERROR';
            case common_1.HttpStatus.INTERNAL_SERVER_ERROR:
                return 'INTERNAL_ERROR';
            case common_1.HttpStatus.BAD_GATEWAY:
                return 'EXTERNAL_SERVICE_ERROR';
            case common_1.HttpStatus.SERVICE_UNAVAILABLE:
                return 'SERVICE_UNAVAILABLE';
            default:
                return `HTTP_${status}`;
        }
    }
    flattenValidationErrors(errors, parentPath = '') {
        return errors.reduce((accumulator, error) => {
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
    extractCorrelationId(request) {
        return (request.headers['x-correlation-id'] ||
            request.headers['correlation-id'] ||
            request.body?.correlationId ||
            undefined);
    }
    extractTransactionId(request) {
        const body = request.body;
        return body?.transaction?.id;
    }
    isKeyResolutionError(exception) {
        if (!(exception instanceof common_1.HttpException)) {
            return false;
        }
        const response = exception.getResponse();
        return typeof response === 'object' && response !== null && 'networkCode' in response;
    }
    handleKeyResolutionError(exception, response, request, correlationId) {
        const exceptionResponse = exception.getResponse();
        const httpStatus = exception.getStatus();
        const message = String(exceptionResponse.message || 'Key resolution error');
        this.logError(exception, {
            message,
            errorCode: 'KEY_RESOLUTION_ERROR',
            httpStatus,
            correlationId
        }, request, correlationId);
        const state = exceptionResponse.responseCode || 'ERROR';
        const responseData = {
            state,
            ...(exceptionResponse.networkCode && { networkCode: exceptionResponse.networkCode }),
            ...(exceptionResponse.networkMessage && { networkMessage: exceptionResponse.networkMessage }),
            ...(exceptionResponse.key && { key: exceptionResponse.key }),
            ...(exceptionResponse.keyType && { keyType: exceptionResponse.keyType })
        };
        const standardResponse = {
            code: httpStatus,
            message,
            data: responseData
        };
        response.status(httpStatus).json(standardResponse);
    }
    isTimeoutError(exception) {
        if (!(exception instanceof Error))
            return false;
        const message = exception.message.toLowerCase();
        return message.includes('timeout') || message.includes('etimedout') || exception.name === 'TimeoutError';
    }
    isNetworkError(exception) {
        if (!(exception instanceof Error))
            return false;
        const message = exception.message.toLowerCase();
        return (message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('econnreset') ||
            message.includes('network') ||
            exception.name === 'NetworkError');
    }
    mapToResponseCode(errorCode) {
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
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [themis_1.ThLoggerService])
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map