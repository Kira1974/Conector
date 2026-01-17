import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

import { TransferMessage } from '../constant';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';

import { ErrorMessageMapper, NetworkErrorInfo } from './error-message.mapper';

const DEFAULT_DIFE_ERROR_MESSAGE = 'DIFE error';

export function buildDifeErrorResponseIfAny(
  request: TransferRequestDto,
  keyResolution: DifeKeyResponseDto
): TransferResponseDto | null {
  if (keyResolution.status === 'ERROR') {
    const errorDescriptions = keyResolution.errors || [];
    const firstError = errorDescriptions[0];
    const errorCode = firstError?.code;
    const errorDescription = firstError?.description || DEFAULT_DIFE_ERROR_MESSAGE;

    const errorInfo: NetworkErrorInfo = {
      code: errorCode,
      description: errorDescription,
      source: 'DIFE'
    };

    const mappedMessage = ErrorMessageMapper.mapToMessage(errorInfo);
    const responseCode = determineResponseCodeFromMessage(mappedMessage, true, errorInfo);

    return {
      transactionId: request.transaction.id,
      responseCode,
      message: mappedMessage,
      networkMessage: ErrorMessageMapper.formatNetworkErrorMessage(errorDescription, 'DIFE'),
      networkCode: errorCode
    };
  }

  return null;
}

export function validateKeyFormatBeforeResolution(request: TransferRequestDto): TransferResponseDto | null {
  const keyValue = request.transaction.payee.account.detail?.['KEY_VALUE'] as string | undefined;

  if (!keyValue || keyValue.trim() === '') {
    return buildValidationErrorResponse(request.transaction.id, TransferMessage.INVALID_KEY_FORMAT);
  }

  const isNumericKey = /^@?\d+$/.test(keyValue);
  const isAlphaKey = /^[A-Z]+$/.test(keyValue);
  const isEmailKey = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(keyValue);

  if (!isNumericKey && !isAlphaKey && !isEmailKey) {
    return buildValidationErrorResponse(request.transaction.id, TransferMessage.INVALID_KEY_FORMAT);
  }

  return null;
}

export function determineResponseCodeFromMessage(
  message: TransferMessage,
  fromProvider: boolean = false,
  errorInfo?: NetworkErrorInfo | null
): TransferResponseCode {
  if (fromProvider && errorInfo) {
    const isControlled = ErrorMessageMapper.isControlledProviderError(errorInfo);

    if (!isControlled) {
      return TransferResponseCode.PROVIDER_ERROR;
    }
  }

  switch (message) {
    case TransferMessage.VALIDATION_FAILED:
    case TransferMessage.INVALID_KEY_FORMAT:
    case TransferMessage.INVALID_ACCOUNT_NUMBER:
      return fromProvider ? TransferResponseCode.REJECTED_BY_PROVIDER : TransferResponseCode.VALIDATION_FAILED;
    case TransferMessage.KEY_NOT_FOUND_OR_CANCELED:
    case TransferMessage.KEY_SUSPENDED:
    case TransferMessage.KEY_SUSPENDED_BY_PARTICIPANT:
    case TransferMessage.PAYMENT_REJECTED:
    case TransferMessage.PAYMENT_DECLINED:
    case TransferMessage.KEY_RESOLUTION_ERROR:
    case TransferMessage.TIMEOUT_ERROR:
      return TransferResponseCode.REJECTED_BY_PROVIDER;
    case TransferMessage.PROVIDER_ERROR:
    case TransferMessage.PAYMENT_NETWORK_ERROR:
    case TransferMessage.KEY_RESOLUTION_NETWORK_ERROR:
      return TransferResponseCode.PROVIDER_ERROR;
    default:
      return TransferResponseCode.ERROR;
  }
}

function buildValidationErrorResponse(
  transactionId: string,
  message: TransferMessage,
  networkMessage?: string,
  networkCode?: string
): TransferResponseDto {
  const fromProvider = !!networkCode;
  return {
    transactionId,
    responseCode: determineResponseCodeFromMessage(message, fromProvider),
    message,
    ...(networkMessage && { networkMessage }),
    ...(networkCode && { networkCode })
  };
}

export function extractNetworkErrorInfo(errorMessage: string): { code?: string; source: 'DIFE' | 'MOL' } | null {
  const difeMatch = errorMessage.match(/(DIFE-\d{4})/);
  if (difeMatch) {
    return { code: difeMatch[1], source: 'DIFE' };
  }

  const molMatch = errorMessage.match(/(MOL-\d{4})/);
  if (molMatch) {
    return { code: molMatch[1], source: 'MOL' };
  }

  return null;
}
