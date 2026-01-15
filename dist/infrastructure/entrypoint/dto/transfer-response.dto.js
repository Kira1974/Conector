"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferResponseDto = exports.TransferResponseCode = void 0;
var TransferResponseCode;
(function (TransferResponseCode) {
    TransferResponseCode["APPROVED"] = "APPROVED";
    TransferResponseCode["SUCCESSFUL"] = "SUCCESSFUL";
    TransferResponseCode["PENDING"] = "PENDING";
    TransferResponseCode["REJECTED_BY_PROVIDER"] = "REJECTED_BY_PROVIDER";
    TransferResponseCode["VALIDATION_FAILED"] = "VALIDATION_FAILED";
    TransferResponseCode["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    TransferResponseCode["ERROR"] = "ERROR";
})(TransferResponseCode || (exports.TransferResponseCode = TransferResponseCode = {}));
class TransferResponseDto {
}
exports.TransferResponseDto = TransferResponseDto;
//# sourceMappingURL=transfer-response.dto.js.map