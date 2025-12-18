import { TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';

export enum MolPaymentStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export class MolPaymentStatusMapper {
  static mapMolStatusToTransferResponseCode(molStatus: MolPaymentStatus): TransferResponseCode {
    switch (molStatus) {
      case MolPaymentStatus.PROCESSING:
      case MolPaymentStatus.COMPLETED:
      case MolPaymentStatus.PENDING:
        return TransferResponseCode.PENDING;
      case MolPaymentStatus.ERROR:
      case MolPaymentStatus.FAILED:
      case MolPaymentStatus.CANCELLED:
        return TransferResponseCode.ERROR;
      default:
        return TransferResponseCode.ERROR;
    }
  }

  static getStatusMessage(molStatus: MolPaymentStatus): string {
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
