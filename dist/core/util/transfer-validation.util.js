"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdditionalDataFromKeyResolution = exports.extractNetworkErrorInfo = exports.determineResponseCodeFromMessage = exports.isMolValidationErrorByCode = exports.isMolValidationError = exports.isDifeValidationError = exports.validateKeyFormatBeforeResolution = exports.buildDifeErrorResponseIfAny = void 0;
const constant_1 = require("../constant");
const transfer_response_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-response.dto");
const error_message_mapper_1 = require("./error-message.mapper");
const DIFE_VALIDATION_ERROR_CODE_MIN = 4000;
const DIFE_VALIDATION_ERROR_CODE_MAX = 6000;
const DEFAULT_DIFE_ERROR_MESSAGE = 'DIFE error';
function buildDifeErrorResponseIfAny(request, keyResolution) {
    if (keyResolution.status === 'ERROR') {
        const errorDescriptions = keyResolution.errors || [];
        const firstError = errorDescriptions[0];
        const errorCode = firstError?.code;
        const errorDescription = firstError?.description || DEFAULT_DIFE_ERROR_MESSAGE;
        const errorInfo = {
            code: errorCode,
            description: errorDescription,
            source: 'DIFE'
        };
        const mappedMessage = error_message_mapper_1.ErrorMessageMapper.mapToMessage(errorInfo);
        const responseCode = determineResponseCodeFromMessage(mappedMessage);
        return {
            transactionId: request.transaction.id,
            responseCode,
            message: mappedMessage,
            networkMessage: error_message_mapper_1.ErrorMessageMapper.formatNetworkErrorMessage(errorDescription, 'DIFE'),
            networkCode: errorCode
        };
    }
    return null;
}
exports.buildDifeErrorResponseIfAny = buildDifeErrorResponseIfAny;
function validateKeyFormatBeforeResolution(request) {
    const keyValue = request.transaction.payee.account.detail?.['KEY_VALUE'];
    if (!keyValue || keyValue.trim() === '') {
        return buildValidationErrorResponse(request.transaction.id, constant_1.TransferMessage.INVALID_KEY_FORMAT);
    }
    const isNumericKey = /^@?\d+$/.test(keyValue);
    const isAlphaKey = /^[A-Z]+$/.test(keyValue);
    const isEmailKey = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(keyValue);
    if (!isNumericKey && !isAlphaKey && !isEmailKey) {
        return buildValidationErrorResponse(request.transaction.id, constant_1.TransferMessage.INVALID_KEY_FORMAT);
    }
    return null;
}
exports.validateKeyFormatBeforeResolution = validateKeyFormatBeforeResolution;
function isDifeValidationError(errorMessage) {
    if (!errorMessage) {
        return false;
    }
    const difeErrorCodePattern = /(DIFE-\d{4})/;
    const match = errorMessage.match(difeErrorCodePattern);
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
function determineResponseCodeFromMessage(message) {
    switch (message) {
        case constant_1.TransferMessage.VALIDATION_FAILED:
            return transfer_response_dto_1.TransferResponseCode.VALIDATION_FAILED;
        case constant_1.TransferMessage.INVALID_KEY_FORMAT:
        case constant_1.TransferMessage.INVALID_ACCOUNT_NUMBER:
        case constant_1.TransferMessage.KEY_NOT_FOUND_OR_CANCELED:
        case constant_1.TransferMessage.KEY_SUSPENDED:
        case constant_1.TransferMessage.PAYMENT_REJECTED:
        case constant_1.TransferMessage.PAYMENT_DECLINED:
            return transfer_response_dto_1.TransferResponseCode.REJECTED_BY_PROVIDER;
        case constant_1.TransferMessage.PROVIDER_ERROR:
            return transfer_response_dto_1.TransferResponseCode.PROVIDER_ERROR;
        default:
            return transfer_response_dto_1.TransferResponseCode.ERROR;
    }
}
exports.determineResponseCodeFromMessage = determineResponseCodeFromMessage;
function buildValidationErrorResponse(transactionId, message, networkMessage, networkCode) {
    return {
        transactionId,
        responseCode: determineResponseCodeFromMessage(message),
        message,
        ...(networkMessage && { networkMessage }),
        ...(networkCode && { networkCode })
    };
}
function extractNetworkErrorInfo(errorMessage) {
    const difeMatch = errorMessage.match(/(DIFE-\d{4})/);
    if (difeMatch) {
        return { code: difeMatch[1], source: 'DIFE' };
    }
    const molMatch = errorMessage.match(/(MOL-\d{4})/);
    if (molMatch) {
        return { code: molMatch[1], source: 'MOL' };
    }
    return null;
}
exports.extractNetworkErrorInfo = extractNetworkErrorInfo;
function buildAdditionalDataFromKeyResolution(keyResolution) {
    if (!keyResolution.key) {
        return {};
    }
    const key = keyResolution.key;
    const accountNumber = key.payment_method?.number;
    const accountType = key.payment_method?.type;
    const documentNumber = key.person?.identification?.number;
    const firstName = key.person?.name?.first_name;
    const secondName = key.person?.name?.second_name;
    const lastName = key.person?.name?.last_name;
    const secondLastName = key.person?.name?.second_last_name;
    const legalName = key.person?.legal_name;
    const obfuscatedName = buildObfuscatedName(firstName, secondName, lastName, secondLastName, legalName);
    return {
        ...(accountNumber && { ACCOUNT_NUMBER: accountNumber }),
        ...(accountType && { ACCOUNT_TYPE: accountType }),
        ...(documentNumber && { DOCUMENT_NUMBER: documentNumber }),
        ...(obfuscatedName && { OBFUSCATED_NAME: obfuscatedName })
    };
}
exports.buildAdditionalDataFromKeyResolution = buildAdditionalDataFromKeyResolution;
function buildObfuscatedName(firstName, secondName, lastName, secondLastName, legalName) {
    if (legalName) {
        return obfuscateText(legalName);
    }
    const nameParts = [firstName, secondName, lastName, secondLastName].filter((part) => part && part.trim() !== '');
    if (nameParts.length === 0) {
        return null;
    }
    return nameParts.map((part) => obfuscateText(part)).join(' ');
}
function obfuscateText(text) {
    if (!text || text.length <= 3) {
        return text;
    }
    const firstThree = text.slice(0, 3);
    const asterisks = '*'.repeat(text.length - 3);
    return `${firstThree}${asterisks}`;
}
//# sourceMappingURL=transfer-validation.util.js.map