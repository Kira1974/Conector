import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { KeyResolutionResponse } from '../model';
import {
  MolPaymentQueryRequestDto,
  MolPaymentQueryResponseDto
} from '../../infrastructure/provider/http-clients/dto/mol-payment-query.dto';

/**
 * MOL Payment Provider abstract class for payment operations
 * Defines the contract that core layer depends on
 */
export abstract class IMolPaymentProvider {
  /**
   * Create payment using MOL API
   * Returns the response DTO directly
   */
  abstract createPayment(
    request: TransferRequestDto,
    keyResolution: KeyResolutionResponse
  ): Promise<TransferResponseDto>;

  /**
   * Query payment status using MOL API
   * Returns the response DTO directly
   */
  abstract queryPaymentStatus(
    request: MolPaymentQueryRequestDto,
    timeout?: number
  ): Promise<MolPaymentQueryResponseDto>;
}
