"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyResolutionHttpStatusMapper = void 0;
const common_1 = require("@nestjs/common");
class KeyResolutionHttpStatusMapper {
    static mapNetworkCodeToHttpStatus(networkCode) {
        if (!networkCode) {
            return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        }
        if (this.isNotFoundError(networkCode)) {
            return common_1.HttpStatus.NOT_FOUND;
        }
        if (this.isFormatValidationError(networkCode)) {
            return common_1.HttpStatus.BAD_REQUEST;
        }
        if (this.isBusinessValidationError(networkCode)) {
            return common_1.HttpStatus.UNPROCESSABLE_ENTITY;
        }
        if (this.isTimeoutError(networkCode)) {
            return common_1.HttpStatus.GATEWAY_TIMEOUT;
        }
        if (this.isServiceError(networkCode)) {
            return common_1.HttpStatus.BAD_GATEWAY;
        }
        return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
    }
    static isNotFoundError(networkCode) {
        const notFoundErrors = ['DIFE-0004', 'DIFE-5009'];
        return notFoundErrors.includes(networkCode);
    }
    static isFormatValidationError(networkCode) {
        const formatValidationErrors = ['DIFE-4000', 'DIFE-5005'];
        return formatValidationErrors.includes(networkCode);
    }
    static isBusinessValidationError(networkCode) {
        const businessValidationErrors = ['DIFE-0005', 'DIFE-0006', 'DIFE-4001', 'DIFE-5012', 'DIFE-5017'];
        return businessValidationErrors.includes(networkCode);
    }
    static isTimeoutError(networkCode) {
        return networkCode === 'DIFE-5000';
    }
    static isServiceError(networkCode) {
        const serviceErrors = ['DIFE-0008', 'DIFE-5001', 'DIFE-5003', 'DIFE-9999'];
        return serviceErrors.includes(networkCode) || networkCode.startsWith('DIFE-999');
    }
}
exports.KeyResolutionHttpStatusMapper = KeyResolutionHttpStatusMapper;
//# sourceMappingURL=key-resolution-http-status.mapper.js.map