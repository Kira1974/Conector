import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';

import { TransferMessage } from '../constant';

import { calculateKeyType } from './key-type.util';
import { validateKeyFormat } from './key-format-validator.util';

export function validateKeyFormatBeforeResolution(request: TransferRequestDto): TransferResponseDto | null {
  const key = request.transactionParties.payee.accountInfo.value;
  const keyType = calculateKeyType(key);
  const validation = validateKeyFormat(key, keyType);

  if (!validation.isValid) {
    return {
      transactionId: request.transactionId,
      responseCode: TransferResponseCode.VALIDATION_FAILED,
      message: TransferMessage.INVALID_KEY_FORMAT,
      networkMessage: undefined,
      networkCode: undefined
    };
  }

  return null;
}
