"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineResponseCodeFromMessage = exports.isMolValidationErrorByCode = exports.isMolValidationError = exports.isDifeValidationError = exports.buildDifeErrorResponseIfAny = exports.extractBrebAccountNumber = exports.validateBrebAccountNumber = exports.validatePayeeDocumentNumber = void 0;
const constant_1 = require("../constant");
const transfer_response_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-response.dto");
const error_message_mapper_1 = require("./error-message.mapper");
const BREB_ACCOUNT_NUMBER_KEY = 'BREB_ACCOUNT_NUMBER';
const DIFE_VALIDATION_ERROR_CODE_MIN = 4000;
const DIFE_VALIDATION_ERROR_CODE_MAX = 6000;
function validatePayeeDocumentNumber(request, keyResolution) {
    const payeeDocumentNumber = request.transactionParties.payee.documentNumber;
    if (!payeeDocumentNumber) {
        return null;
    }
    const resolvedDocumentNumber = keyResolution.resolvedKey?.person.identificationNumber;
    if (!resolvedDocumentNumber) {
        return null;
    }
    if (payeeDocumentNumber !== resolvedDocumentNumber) {
        return buildValidationErrorResponse(request.transactionId, constant_1.TransferMessage.DOCUMENT_MISMATCH);
    }
    return null;
}
exports.validatePayeeDocumentNumber = validatePayeeDocumentNumber;
function validateBrebAccountNumber(request, keyResolution) {
    const brebAccountNumber = extractBrebAccountNumber(request.additionalData);
    if (!brebAccountNumber) {
        return null;
    }
    const resolvedPaymentMethodNumber = keyResolution.resolvedKey?.paymentMethod.number;
    if (!resolvedPaymentMethodNumber) {
        return null;
    }
    if (brebAccountNumber !== resolvedPaymentMethodNumber) {
        return buildValidationErrorResponse(request.transactionId, constant_1.TransferMessage.ACCOUNT_MISMATCH);
    }
    return null;
}
exports.validateBrebAccountNumber = validateBrebAccountNumber;
function extractBrebAccountNumber(additionalData) {
    if (!additionalData) {
        return null;
    }
    const brebAccountNumber = additionalData[BREB_ACCOUNT_NUMBER_KEY];
    if (!brebAccountNumber || typeof brebAccountNumber !== 'string') {
        return null;
    }
    return brebAccountNumber;
}
exports.extractBrebAccountNumber = extractBrebAccountNumber;
const DEFAULT_DIFE_ERROR_MESSAGE = 'DIFE error';
function buildDifeErrorResponseIfAny(request, keyResolution) {
    if (keyResolution.status === 'ERROR') {
        const errorDescriptions = keyResolution.errors || [];
        const firstError = errorDescriptions[0] || DEFAULT_DIFE_ERROR_MESSAGE;
        const errorCode = extractDifeErrorCode(firstError);
        const errorDescription = extractDifeErrorDescription(firstError);
        const errorInfo = errorCode
            ? {
                code: errorCode,
                description: errorDescription,
                source: 'DIFE'
            }
            : null;
        const mappedMessage = error_message_mapper_1.ErrorMessageMapper.mapToMessage(errorInfo);
        const responseCode = determineResponseCodeFromMessage(mappedMessage);
        return {
            transactionId: request.transactionId,
            responseCode,
            message: mappedMessage,
            networkMessage: errorInfo
                ? error_message_mapper_1.ErrorMessageMapper.formatNetworkErrorMessage(errorInfo.description, errorInfo.source)
                : undefined,
            networkCode: errorInfo?.code
        };
    }
    if (!keyResolution.resolvedKey) {
        const errorInfo = {
            code: undefined,
            description: 'Key resolution returned no data',
            source: 'DIFE'
        };
        return {
            transactionId: request.transactionId,
            responseCode: transfer_response_dto_1.TransferResponseCode.ERROR,
            message: constant_1.TransferMessage.KEY_RESOLUTION_ERROR,
            networkMessage: error_message_mapper_1.ErrorMessageMapper.formatNetworkErrorMessage(errorInfo.description, errorInfo.source),
            networkCode: undefined
        };
    }
    return null;
}
exports.buildDifeErrorResponseIfAny = buildDifeErrorResponseIfAny;
function isDifeValidationErrorCode(errorCode) {
    const validationErrorCodes = [
        'DIFE-0004',
        'DIFE-0005',
        'DIFE-0006',
        'DIFE-0007',
        'DIFE-0009',
        'DIFE-0010',
        'DIFE-0011',
        'DIFE-0012',
        'DIFE-0013',
        'DIFE-0014',
        'DIFE-0015',
        'DIFE-0016',
        'DIFE-0018',
        'DIFE-4000',
        'DIFE-4001',
        'DIFE-5004',
        'DIFE-5005',
        'DIFE-5006',
        'DIFE-5007',
        'DIFE-5010',
        'DIFE-5011',
        'DIFE-5012',
        'DIFE-5013',
        'DIFE-5014',
        'DIFE-5015',
        'DIFE-5016',
        'DIFE-5017',
        'DIFE-5018',
        'DIFE-5019',
        'DIFE-5021',
        'DIFE-5022',
        'DIFE-5023',
        'DIFE-5024',
        'DIFE-5025',
        'DIFE-5026'
    ];
    if (validationErrorCodes.includes(errorCode)) {
        return true;
    }
    const match = errorCode.match(/DIFE-(\d{4})/);
    if (!match) {
        return false;
    }
    const codeNumber = parseInt(match[1], 10);
    return codeNumber >= DIFE_VALIDATION_ERROR_CODE_MIN && codeNumber < DIFE_VALIDATION_ERROR_CODE_MAX;
}
function isDifeValidationError(errorMessage) {
    if (!errorMessage) {
        return false;
    }
    const difeErrorPattern = /DIFE-(\d{4})/;
    const match = errorMessage.match(difeErrorPattern);
    if (!match) {
        return false;
    }
    const errorCode = match[0];
    const validationErrorCodes = ['DIFE-0004', 'DIFE-0005', 'DIFE-4000', 'DIFE-4001', 'DIFE-5005'];
    if (validationErrorCodes.includes(errorCode)) {
        return true;
    }
    const codeNumber = parseInt(match[1], 10);
    return codeNumber >= DIFE_VALIDATION_ERROR_CODE_MIN && codeNumber < DIFE_VALIDATION_ERROR_CODE_MAX;
}
exports.isDifeValidationError = isDifeValidationError;
const MOL_VALIDATION_ERROR_CODES = [
    '400',
    '403',
    'MOL-4003',
    'MOL-4006',
    'MOL-4007',
    'MOL-4008',
    'MOL-4009',
    'MOL-4010',
    'MOL-4011',
    'MOL-4012',
    'MOL-4013',
    'MOL-4014',
    'MOL-4016',
    'MOL-5005'
];
function isMolValidationError(errorMessage) {
    if (!errorMessage) {
        return false;
    }
    const molErrorCodePattern = /(MOL-\d{4})/;
    const molMatch = errorMessage.match(molErrorCodePattern);
    if (molMatch) {
        const errorCode = molMatch[1];
        return MOL_VALIDATION_ERROR_CODES.includes(errorCode);
    }
    const httpErrorPattern = /(?:status code|http|:\s*)(400|403)/i;
    const httpMatch = errorMessage.match(httpErrorPattern);
    if (httpMatch) {
        return true;
    }
    if (errorMessage.includes(': 400') || errorMessage.includes(': 403')) {
        return true;
    }
    if (errorMessage.includes('400:') || errorMessage.includes('403:')) {
        return true;
    }
    return false;
}
exports.isMolValidationError = isMolValidationError;
function isMolValidationErrorByCode(errorInfo) {
    if (!errorInfo || errorInfo.source !== 'MOL') {
        return false;
    }
    if (!errorInfo.code) {
        return false;
    }
    return MOL_VALIDATION_ERROR_CODES.includes(errorInfo.code);
}
exports.isMolValidationErrorByCode = isMolValidationErrorByCode;
function extractDifeErrorCode(errorString) {
    const match = errorString.match(/(DIFE-\d{4})/);
    return match ? match[1] : undefined;
}
function extractDifeErrorDescription(errorString) {
    const match = errorString.match(/DIFE-\d{4}: (.+)/);
    return match ? match[1] : errorString;
}
function determineResponseCodeFromMessage(message) {
    switch (message) {
        case constant_1.TransferMessage.DOCUMENT_MISMATCH:
        case constant_1.TransferMessage.ACCOUNT_MISMATCH:
            return transfer_response_dto_1.TransferResponseCode.VALIDATION_FAILED;
        case constant_1.TransferMessage.VALIDATION_FAILED:
        case constant_1.TransferMessage.INVALID_KEY_FORMAT:
        case constant_1.TransferMessage.INVALID_ACCOUNT_NUMBER:
        case constant_1.TransferMessage.KEY_NOT_FOUND_OR_CANCELED:
        case constant_1.TransferMessage.KEY_SUSPENDED:
        case constant_1.TransferMessage.PAYMENT_REJECTED:
        case constant_1.TransferMessage.PAYMENT_DECLINED:
            return transfer_response_dto_1.TransferResponseCode.REJECTED_BY_PROVIDER;
        default:
            return transfer_response_dto_1.TransferResponseCode.ERROR;
    }
}
exports.determineResponseCodeFromMessage = determineResponseCodeFromMessage;
function buildValidationErrorResponse(transactionId, message, networkMessage, networkCode) {
    return {
        transactionId,
        responseCode: transfer_response_dto_1.TransferResponseCode.VALIDATION_FAILED,
        message,
        networkMessage,
        networkCode
    };
}
//# sourceMappingURL=transfer-validation.util.js.map