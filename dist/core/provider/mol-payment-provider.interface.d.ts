import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { KeyResolutionResponse } from '../model';
import { MolPaymentQueryRequestDto, MolPaymentQueryResponseDto } from '../../infrastructure/provider/http-clients/dto/mol-payment-query.dto';
export declare abstract class IMolPaymentProvider {
    abstract createPayment(request: TransferRequestDto, keyResolution: KeyResolutionResponse): Promise<TransferResponseDto>;
    abstract queryPaymentStatus(request: MolPaymentQueryRequestDto, timeout?: number): Promise<MolPaymentQueryResponseDto>;
}
