"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessageMapper = void 0;
const transfer_message_enum_1 = require("../constant/transfer-message.enum");
class ErrorMessageMapper {
    static mapToMessage(errorInfo) {
        if (!errorInfo) {
            return transfer_message_enum_1.TransferMessage.UNKNOWN_ERROR;
        }
        if (errorInfo.code) {
            if (errorInfo.code.startsWith('DIFE-')) {
                if (this.DIFE_ERROR_CODE_MAP[errorInfo.code]) {
                    return this.DIFE_ERROR_CODE_MAP[errorInfo.code];
                }
            }
            else if (errorInfo.code.startsWith('MOL-')) {
                if (this.MOL_ERROR_CODE_MAP[errorInfo.code]) {
                    return this.MOL_ERROR_CODE_MAP[errorInfo.code];
                }
            }
            const codeMap = errorInfo.source === 'DIFE' ? this.DIFE_ERROR_CODE_MAP : this.MOL_ERROR_CODE_MAP;
            if (codeMap[errorInfo.code]) {
                return codeMap[errorInfo.code];
            }
            if (this.HTTP_ERROR_CODE_MAP[errorInfo.code]) {
                return this.HTTP_ERROR_CODE_MAP[errorInfo.code];
            }
        }
        if (errorInfo.description) {
            const lowerDescription = errorInfo.description.toLowerCase();
            if (lowerDescription.includes('status code') || lowerDescription.includes('http')) {
                const httpCodeMatch = lowerDescription.match(/status code (\d+)|http (\d+)/i);
                if (httpCodeMatch) {
                    const httpCode = httpCodeMatch[1] || httpCodeMatch[2];
                    if (this.HTTP_ERROR_CODE_MAP[httpCode]) {
                        return this.HTTP_ERROR_CODE_MAP[httpCode];
                    }
                    return transfer_message_enum_1.TransferMessage.PROVIDER_ERROR;
                }
            }
            if (lowerDescription.includes('payment') && lowerDescription.includes('fail')) {
                return transfer_message_enum_1.TransferMessage.PAYMENT_PROCESSING_ERROR;
            }
            if (lowerDescription.includes('timeout')) {
                return transfer_message_enum_1.TransferMessage.PROVIDER_ERROR;
            }
        }
        return transfer_message_enum_1.TransferMessage.UNKNOWN_ERROR;
    }
    static formatNetworkErrorMessage(description, source) {
        return `${source}: ${description}`;
    }
    static isControlledProviderError(errorInfo) {
        if (!errorInfo || !errorInfo.code) {
            return false;
        }
        if (errorInfo.source === 'DIFE') {
            return !this.DIFE_UNCONTROLLED_ERRORS.includes(errorInfo.code);
        }
        if (errorInfo.source === 'MOL') {
            return !this.MOL_UNCONTROLLED_ERRORS.includes(errorInfo.code);
        }
        return false;
    }
}
exports.ErrorMessageMapper = ErrorMessageMapper;
ErrorMessageMapper.DIFE_ERROR_CODE_MAP = {
    'DIFE-0001': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0002': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0003': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0004': transfer_message_enum_1.TransferMessage.KEY_NOT_FOUND_OR_CANCELED,
    'DIFE-0005': transfer_message_enum_1.TransferMessage.KEY_SUSPENDED,
    'DIFE-0006': transfer_message_enum_1.TransferMessage.KEY_SUSPENDED_BY_PARTICIPANT,
    'DIFE-0007': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0008': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-0009': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0010': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0011': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0012': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0013': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0014': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0015': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-0016': transfer_message_enum_1.TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-0017': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0018': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-4000': transfer_message_enum_1.TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-4001': transfer_message_enum_1.TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-5000': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-5001': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    'DIFE-5002': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5003': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    'DIFE-5004': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5005': transfer_message_enum_1.TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-5006': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5007': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5008': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5009': transfer_message_enum_1.TransferMessage.KEY_NOT_FOUND_OR_CANCELED,
    'DIFE-5010': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5011': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5012': transfer_message_enum_1.TransferMessage.KEY_SUSPENDED,
    'DIFE-5013': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5014': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5015': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5016': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5017': transfer_message_enum_1.TransferMessage.KEY_SUSPENDED,
    'DIFE-5018': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5019': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5020': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-5021': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5022': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5023': transfer_message_enum_1.TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5024': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5025': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-5026': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'DIFE-9991': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9992': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9993': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9994': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9995': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9996': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9997': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9998': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'DIFE-9999': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR
};
ErrorMessageMapper.MOL_ERROR_CODE_MAP = {
    '403': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    '400': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    '500': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'MOL-5000': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'MOL-5005': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'MOL-4009': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'MOL-4008': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'MOL-4007': transfer_message_enum_1.TransferMessage.INVALID_ACCOUNT_NUMBER,
    'MOL-4006': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'MOL-4003': transfer_message_enum_1.TransferMessage.VALIDATION_FAILED,
    'MOL-4010': transfer_message_enum_1.TransferMessage.INVALID_ACCOUNT_NUMBER,
    'MOL-4011': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    'MOL-4012': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    'MOL-4013': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    'MOL-4014': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    'MOL-4016': transfer_message_enum_1.TransferMessage.PAYMENT_REJECTED,
    'MOL-4017': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    'MOL-4019': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR
};
ErrorMessageMapper.HTTP_ERROR_CODE_MAP = {
    '500': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    '502': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    '503': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR,
    '504': transfer_message_enum_1.TransferMessage.PROVIDER_ERROR
};
ErrorMessageMapper.DIFE_UNCONTROLLED_ERRORS = [
    'DIFE-0001',
    'DIFE-0002',
    'DIFE-0003',
    'DIFE-0008',
    'DIFE-5000',
    'DIFE-5002',
    'DIFE-5008',
    'DIFE-5020',
    'DIFE-9991',
    'DIFE-9992',
    'DIFE-9993',
    'DIFE-9994',
    'DIFE-9995',
    'DIFE-9996',
    'DIFE-9997',
    'DIFE-9998',
    'DIFE-9999'
];
ErrorMessageMapper.MOL_UNCONTROLLED_ERRORS = ['MOL-5000', 'MOL-4017', 'MOL-4019', '500', '502', '503', '504'];
//# sourceMappingURL=error-message.mapper.js.map