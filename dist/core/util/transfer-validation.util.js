"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNetworkErrorInfo = exports.determineResponseCodeFromMessage = exports.validateKeyFormatBeforeResolution = exports.buildDifeErrorResponseIfAny = void 0;
const constant_1 = require("../constant");
const transfer_response_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-response.dto");
const error_message_mapper_1 = require("./error-message.mapper");
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
        const responseCode = determineResponseCodeFromMessage(mappedMessage, true, errorInfo);
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
function determineResponseCodeFromMessage(message, fromProvider = false, errorInfo) {
    if (fromProvider && errorInfo) {
        const isControlled = error_message_mapper_1.ErrorMessageMapper.isControlledProviderError(errorInfo);
        if (!isControlled) {
            return transfer_response_dto_1.TransferResponseCode.PROVIDER_ERROR;
        }
    }
    switch (message) {
        case constant_1.TransferMessage.VALIDATION_FAILED:
        case constant_1.TransferMessage.INVALID_KEY_FORMAT:
        case constant_1.TransferMessage.INVALID_ACCOUNT_NUMBER:
            return fromProvider ? transfer_response_dto_1.TransferResponseCode.REJECTED_BY_PROVIDER : transfer_response_dto_1.TransferResponseCode.VALIDATION_FAILED;
        case constant_1.TransferMessage.KEY_NOT_FOUND_OR_CANCELED:
        case constant_1.TransferMessage.KEY_SUSPENDED:
        case constant_1.TransferMessage.KEY_SUSPENDED_BY_PARTICIPANT:
        case constant_1.TransferMessage.PAYMENT_REJECTED:
        case constant_1.TransferMessage.PAYMENT_DECLINED:
        case constant_1.TransferMessage.KEY_RESOLUTION_ERROR:
        case constant_1.TransferMessage.TIMEOUT_ERROR:
            return transfer_response_dto_1.TransferResponseCode.REJECTED_BY_PROVIDER;
        case constant_1.TransferMessage.PROVIDER_ERROR:
        case constant_1.TransferMessage.PAYMENT_NETWORK_ERROR:
        case constant_1.TransferMessage.KEY_RESOLUTION_NETWORK_ERROR:
            return transfer_response_dto_1.TransferResponseCode.PROVIDER_ERROR;
        default:
            return transfer_response_dto_1.TransferResponseCode.ERROR;
    }
}
exports.determineResponseCodeFromMessage = determineResponseCodeFromMessage;
function buildValidationErrorResponse(transactionId, message, networkMessage, networkCode) {
    const fromProvider = !!networkCode;
    return {
        transactionId,
        responseCode: determineResponseCodeFromMessage(message, fromProvider),
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
//# sourceMappingURL=transfer-validation.util.js.map