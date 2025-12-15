import { TransferResponseCode } from '../../../entrypoint/dto/transfer-response.dto';
export declare enum MolPaymentStatus {
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    PENDING = "PENDING",
    ERROR = "ERROR",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare class MolPaymentStatusMapper {
    static mapMolStatusToTransferResponseCode(molStatus: MolPaymentStatus): TransferResponseCode;
    static getStatusMessage(molStatus: MolPaymentStatus): string;
}
