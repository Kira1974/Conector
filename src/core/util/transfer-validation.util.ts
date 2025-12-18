import { TransferMessage } from '../constant';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

import { ErrorMessageMapper, NetworkErrorInfo } from './error-message.mapper';

const BREB_ACCOUNT_NUMBER_KEY = 'BREB_ACCOUNT_NUMBER';
const DIFE_VALIDATION_ERROR_CODE_MIN = 4000;
const DIFE_VALIDATION_ERROR_CODE_MAX = 6000;

export function validatePayeeDocumentNumber(
  request: TransferRequestDto,
  keyResolution: DifeKeyResponseDto
): TransferResponseDto | null {
  const payeeDocumentNumber = request.transactionParties.payee.documentNumber;
  if (!payeeDocumentNumber) {
    return null;
  }

  const resolvedDocumentNumber = keyResolution.key?.person?.identification?.number;
  if (!resolvedDocumentNumber) {
    return null;
  }

  if (payeeDocumentNumber !== resolvedDocumentNumber) {
    return buildValidationErrorResponse(request.transactionId, TransferMessage.DOCUMENT_MISMATCH);
  }

  return null;
}

export function validateBrebAccountNumber(
  request: TransferRequestDto,
  keyResolution: DifeKeyResponseDto
): TransferResponseDto | null {
  const brebAccountNumber = extractBrebAccountNumber(request.additionalData);
  if (!brebAccountNumber) {
    return null;
  }

  const resolvedPaymentMethodNumber = keyResolution.key?.payment_method?.number;
  if (!resolvedPaymentMethodNumber) {
    return null;
  }

  if (brebAccountNumber !== resolvedPaymentMethodNumber) {
    return buildValidationErrorResponse(request.transactionId, TransferMessage.ACCOUNT_MISMATCH);
  }

  return null;
}

export function extractBrebAccountNumber(additionalData?: Record<string, unknown>): string | null {
  if (!additionalData) {
    return null;
  }

  const brebAccountNumber = additionalData[BREB_ACCOUNT_NUMBER_KEY];
  if (!brebAccountNumber || typeof brebAccountNumber !== 'string') {
    return null;
  }

  return brebAccountNumber;
}

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

    const errorInfo: NetworkErrorInfo | null = errorCode
      ? {
          code: errorCode,
          description: errorDescription,
          source: 'DIFE'
        }
      : null;

    const mappedMessage = ErrorMessageMapper.mapToMessage(errorInfo);
    const responseCode = determineResponseCodeFromMessage(mappedMessage);

    return {
      transactionId: request.transactionId,
      responseCode,
      message: mappedMessage,
      networkMessage: errorInfo
        ? ErrorMessageMapper.formatNetworkErrorMessage(errorInfo.description, errorInfo.source)
        : undefined,
      networkCode: errorInfo?.code
    };
  }

  const hasValidKey =
    keyResolution.key?.key &&
    keyResolution.key.participant &&
    keyResolution.key.payment_method &&
    keyResolution.key.person?.identification &&
    keyResolution.key.person.name;

  if (!hasValidKey) {
    const errorInfo: NetworkErrorInfo = {
      code: undefined,
      description: 'Key resolution returned no data',
      source: 'DIFE'
    };

    return {
      transactionId: request.transactionId,
      responseCode: TransferResponseCode.ERROR,
      message: TransferMessage.KEY_RESOLUTION_ERROR,
      networkMessage: ErrorMessageMapper.formatNetworkErrorMessage(errorInfo.description, errorInfo.source),
      networkCode: undefined
    };
  }

  return null;
}

function isDifeValidationErrorCode(errorCode: string): boolean {
  const validationErrorCodes = [
    'DIFE-0004',
    'DIFE-0005',
    'DIFE-0006',
    'DIFE-0007',
    'DIFE-0009',
    'DIFE-0010',
    'DIFE-0011',
    'DIFE-0012',
    'DIFE-0013',
    'DIFE-0014',
    'DIFE-0015',
    'DIFE-0016',
    'DIFE-0018',
    'DIFE-4000',
    'DIFE-4001',
    'DIFE-5004',
    'DIFE-5005',
    'DIFE-5006',
    'DIFE-5007',
    'DIFE-5010',
    'DIFE-5011',
    'DIFE-5012',
    'DIFE-5013',
    'DIFE-5014',
    'DIFE-5015',
    'DIFE-5016',
    'DIFE-5017',
    'DIFE-5018',
    'DIFE-5019',
    'DIFE-5021',
    'DIFE-5022',
    'DIFE-5023',
    'DIFE-5024',
    'DIFE-5025',
    'DIFE-5026'
  ];
  if (validationErrorCodes.includes(errorCode)) {
    return true;
  }

  const match = errorCode.match(/DIFE-(\d{4})/);
  if (!match) {
    return false;
  }

  const codeNumber = parseInt(match[1], 10);
  return codeNumber >= DIFE_VALIDATION_ERROR_CODE_MIN && codeNumber < DIFE_VALIDATION_ERROR_CODE_MAX;
}

export function isDifeValidationError(errorMessage: string): boolean {
  if (!errorMessage) {
    return false;
  }

  const difeErrorPattern = /DIFE-(\d{4})/;
  const match = errorMessage.match(difeErrorPattern);
  if (!match) {
    return false;
  }

  const errorCode = match[0];
  const validationErrorCodes = ['DIFE-0004', 'DIFE-0005', 'DIFE-4000', 'DIFE-4001', 'DIFE-5005'];
  if (validationErrorCodes.includes(errorCode)) {
    return true;
  }

  const codeNumber = parseInt(match[1], 10);
  return codeNumber >= DIFE_VALIDATION_ERROR_CODE_MIN && codeNumber < DIFE_VALIDATION_ERROR_CODE_MAX;
}

const MOL_VALIDATION_ERROR_CODES = [
  '400',
  '403',
  'MOL-4003',
  'MOL-4006',
  'MOL-4007',
  'MOL-4008',
  'MOL-4009',
  'MOL-4010',
  'MOL-4011',
  'MOL-4012',
  'MOL-4013',
  'MOL-4014',
  'MOL-4016',
  'MOL-5005'
] as const;

export function isMolValidationError(errorMessage: string): boolean {
  if (!errorMessage) {
    return false;
  }

  const molErrorCodePattern = /(MOL-\d{4})/;
  const molMatch = errorMessage.match(molErrorCodePattern);
  if (molMatch) {
    const errorCode = molMatch[1];
    return MOL_VALIDATION_ERROR_CODES.includes(errorCode as (typeof MOL_VALIDATION_ERROR_CODES)[number]);
  }

  const httpErrorPattern = /(?:status code|http|:\s*)(400|403)/i;
  const httpMatch = errorMessage.match(httpErrorPattern);
  if (httpMatch) {
    return true;
  }

  if (errorMessage.includes(': 400') || errorMessage.includes(': 403')) {
    return true;
  }

  if (errorMessage.includes('400:') || errorMessage.includes('403:')) {
    return true;
  }

  return false;
}

export function isMolValidationErrorByCode(errorInfo: { code?: string; source?: string } | null): boolean {
  if (!errorInfo || errorInfo.source !== 'MOL') {
    return false;
  }

  if (!errorInfo.code) {
    return false;
  }

  return MOL_VALIDATION_ERROR_CODES.includes(errorInfo.code as (typeof MOL_VALIDATION_ERROR_CODES)[number]);
}

function extractDifeErrorCode(errorString: string): string | undefined {
  const match = errorString.match(/(DIFE-\d{4})/);
  return match ? match[1] : undefined;
}

function extractDifeErrorDescription(errorString: string): string {
  const match = errorString.match(/DIFE-\d{4}: (.+)/);
  return match ? match[1] : errorString;
}

export function determineResponseCodeFromMessage(message: TransferMessage): TransferResponseCode {
  switch (message) {
    case TransferMessage.DOCUMENT_MISMATCH:
    case TransferMessage.ACCOUNT_MISMATCH:
      return TransferResponseCode.VALIDATION_FAILED;
    case TransferMessage.VALIDATION_FAILED:
    case TransferMessage.INVALID_KEY_FORMAT:
    case TransferMessage.INVALID_ACCOUNT_NUMBER:
    case TransferMessage.KEY_NOT_FOUND_OR_CANCELED:
    case TransferMessage.KEY_SUSPENDED:
    case TransferMessage.PAYMENT_REJECTED:
    case TransferMessage.PAYMENT_DECLINED:
      return TransferResponseCode.REJECTED_BY_PROVIDER;
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
  return {
    transactionId,
    responseCode: TransferResponseCode.VALIDATION_FAILED,
    message,
    networkMessage,
    networkCode
  };
}
