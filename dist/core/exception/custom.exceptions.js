"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProcessingException = exports.KeyResolutionException = exports.ValidationException = exports.ExternalServiceException = exports.TimeoutException = exports.BusinessException = void 0;
const common_1 = require("@nestjs/common");
class BusinessException extends common_1.HttpException {
    constructor(message, errorCode, httpStatus = common_1.HttpStatus.BAD_REQUEST, correlationId) {
        super(message, httpStatus);
        this.errorCode = errorCode;
        this.correlationId = correlationId;
    }
}
exports.BusinessException = BusinessException;
class TimeoutException extends BusinessException {
    constructor(service, timeout, correlationId) {
        super(`Service ${service} timed out after ${timeout}ms`, 'TIMEOUT_ERROR', common_1.HttpStatus.REQUEST_TIMEOUT, correlationId);
    }
}
exports.TimeoutException = TimeoutException;
class ExternalServiceException extends BusinessException {
    constructor(serviceName, message, errorCode = 'EXTERNAL_SERVICE_ERROR', correlationId) {
        super(`External service error in ${serviceName}: ${message}`, errorCode, common_1.HttpStatus.BAD_GATEWAY, correlationId);
        this.serviceName = serviceName;
    }
}
exports.ExternalServiceException = ExternalServiceException;
class ValidationException extends BusinessException {
    constructor(message, field, correlationId) {
        super(message, 'VALIDATION_ERROR', common_1.HttpStatus.BAD_REQUEST, correlationId);
        this.field = field;
    }
}
exports.ValidationException = ValidationException;
class KeyResolutionException extends BusinessException {
    constructor(key, reason, correlationId) {
        super(`Key resolution failed for key ${key}: ${reason}`, 'KEY_RESOLUTION_ERROR', common_1.HttpStatus.UNPROCESSABLE_ENTITY, correlationId);
    }
}
exports.KeyResolutionException = KeyResolutionException;
class PaymentProcessingException extends BusinessException {
    constructor(reason, correlationId) {
        super(`Payment processing failed: ${reason}`, 'PAYMENT_PROCESSING_ERROR', common_1.HttpStatus.UNPROCESSABLE_ENTITY, correlationId);
    }
}
exports.PaymentProcessingException = PaymentProcessingException;
//# sourceMappingURL=custom.exceptions.js.map