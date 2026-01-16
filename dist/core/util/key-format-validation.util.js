"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKeyFormatBeforeResolution = void 0;
const transfer_response_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-response.dto");
const constant_1 = require("../constant");
function validateKeyFormatBeforeResolution(request) {
    const key = request.transaction.payee.account.detail?.['KEY_VALUE'];
    if (!key || key.trim() === '') {
        return {
            transactionId: request.transaction.id,
            responseCode: transfer_response_dto_1.TransferResponseCode.VALIDATION_FAILED,
            message: constant_1.TransferMessage.INVALID_KEY_FORMAT,
            networkMessage: undefined,
            networkCode: undefined
        };
    }
    if (key.length > 200) {
        return {
            transactionId: request.transaction.id,
            responseCode: transfer_response_dto_1.TransferResponseCode.VALIDATION_FAILED,
            message: constant_1.TransferMessage.INVALID_KEY_FORMAT,
            networkMessage: undefined,
            networkCode: undefined
        };
    }
    return null;
}
exports.validateKeyFormatBeforeResolution = validateKeyFormatBeforeResolution;
//# sourceMappingURL=key-format-validation.util.js.map