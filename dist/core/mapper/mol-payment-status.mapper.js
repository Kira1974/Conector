"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MolPaymentStatusMapper = exports.MolPaymentStatus = void 0;
const transfer_response_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-response.dto");
var MolPaymentStatus;
(function (MolPaymentStatus) {
    MolPaymentStatus["PROCESSING"] = "PROCESSING";
    MolPaymentStatus["COMPLETED"] = "COMPLETED";
    MolPaymentStatus["PENDING"] = "PENDING";
    MolPaymentStatus["ERROR"] = "ERROR";
    MolPaymentStatus["FAILED"] = "FAILED";
    MolPaymentStatus["CANCELLED"] = "CANCELLED";
})(MolPaymentStatus || (exports.MolPaymentStatus = MolPaymentStatus = {}));
class MolPaymentStatusMapper {
    static mapMolStatusToTransferResponseCode(molStatus) {
        switch (molStatus) {
            case MolPaymentStatus.PROCESSING:
            case MolPaymentStatus.COMPLETED:
            case MolPaymentStatus.PENDING:
                return transfer_response_dto_1.TransferResponseCode.PENDING;
            case MolPaymentStatus.ERROR:
            case MolPaymentStatus.FAILED:
            case MolPaymentStatus.CANCELLED:
                return transfer_response_dto_1.TransferResponseCode.ERROR;
            default:
                return transfer_response_dto_1.TransferResponseCode.ERROR;
        }
    }
    static getStatusMessage(molStatus) {
        switch (molStatus) {
            case MolPaymentStatus.PROCESSING:
            case MolPaymentStatus.COMPLETED:
            case MolPaymentStatus.PENDING:
                return 'Pago pendiente';
            case MolPaymentStatus.ERROR:
                return 'Error en el pago';
            case MolPaymentStatus.FAILED:
                return 'Pago fallido';
            case MolPaymentStatus.CANCELLED:
                return 'Pago cancelado';
            default:
                return 'Estado desconocido';
        }
    }
}
exports.MolPaymentStatusMapper = MolPaymentStatusMapper;
//# sourceMappingURL=mol-payment-status.mapper.js.map