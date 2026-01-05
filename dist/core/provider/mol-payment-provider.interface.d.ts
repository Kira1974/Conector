import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { DifeKeyResponseDto, MolPaymentQueryRequestDto, MolPaymentQueryResponseDto } from '../../infrastructure/provider/http-clients/dto';
export declare abstract class IMolPaymentProvider {
    abstract createPayment(request: TransferRequestDto, keyResolution: DifeKeyResponseDto): Promise<TransferResponseDto>;
    abstract queryPaymentStatus(request: MolPaymentQueryRequestDto, timeout?: number): Promise<MolPaymentQueryResponseDto>;
}
