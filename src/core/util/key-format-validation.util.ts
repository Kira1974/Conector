import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { TransferMessage } from '../constant';


export function validateKeyFormatBeforeResolution(request: TransferRequestDto): TransferResponseDto | null {
  const key = request.transaction.payee.account.detail?.['KEY_VALUE'] as string | undefined;
  if (!key || key.trim() === '') {
    return {
      transactionId: request.transaction.id,
      responseCode: TransferResponseCode.VALIDATION_FAILED,
      message: TransferMessage.INVALID_KEY_FORMAT,
      networkMessage: undefined,
      networkCode: undefined
    };
  }

  if (key.length > 200) {
    return {
      transactionId: request.transaction.id,
      responseCode: TransferResponseCode.VALIDATION_FAILED,
      message: TransferMessage.INVALID_KEY_FORMAT,
      networkMessage: undefined,
      networkCode: undefined
    };
  }
  return null;
}
