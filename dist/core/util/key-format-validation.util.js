"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKeyFormatBeforeResolution = void 0;
const transfer_response_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-response.dto");
const constant_1 = require("../constant");
const key_format_validator_util_1 = require("./key-format-validator.util");
const key_type_util_1 = require("./key-type.util");
function validateKeyFormatBeforeResolution(request) {
    const key = request.transaction.payee.account.detail?.['KEY_VALUE'];
    const keyType = (0, key_type_util_1.calculateKeyType)(key);
    const validationResult = (0, key_format_validator_util_1.validateKeyFormat)(key, keyType);
    if (!validationResult.isValid) {
        return {
            transactionId: request.transaction.id,
            responseCode: transfer_response_dto_1.TransferResponseCode.VALIDATION_FAILED,
            message: constant_1.TransferMessage.INVALID_KEY_FORMAT,
            networkMessage: validationResult.errorMessage,
            networkCode: undefined
        };
    }
    return null;
}
exports.validateKeyFormatBeforeResolution = validateKeyFormatBeforeResolution;
//# sourceMappingURL=key-format-validation.util.js.map