import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

import { TransferMessage } from '../constant';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';

import { ErrorMessageMapper, NetworkErrorInfo } from './error-message.mapper';

const DIFE_VALIDATION_ERROR_CODE_MIN = 4000;
const DIFE_VALIDATION_ERROR_CODE_MAX = 6000;
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
    const responseCode = determineResponseCodeFromMessage(mappedMessage);

    return {
      transactionId: request.transactionId,
      responseCode,
      message: mappedMessage,
      networkMessage: ErrorMessageMapper.formatNetworkErrorMessage(errorDescription, 'DIFE'),
      networkCode: errorCode
    };
  }

  return null;
}

export function validateKeyFormatBeforeResolution(request: TransferRequestDto): TransferResponseDto | null {
  const keyValue = request.transactionParties.payee.accountInfo.value;

  if (!keyValue || keyValue.trim() === '') {
    return buildValidationErrorResponse(request.transactionId, TransferMessage.INVALID_KEY_FORMAT);
  }

  const isNumericKey = /^@?\d+$/.test(keyValue);
  const isAlphaKey = /^[A-Z]+$/.test(keyValue);
  const isEmailKey = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(keyValue);

  if (!isNumericKey && !isAlphaKey && !isEmailKey) {
    return buildValidationErrorResponse(request.transactionId, TransferMessage.INVALID_KEY_FORMAT);
  }

  return null;
}

export function isDifeValidationError(errorMessage: string): boolean {
  if (!errorMessage) {
    return false;
  }

  const difeErrorCodePattern = /(DIFE-\d{4})/;
  const match = errorMessage.match(difeErrorCodePattern);
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

export function determineResponseCodeFromMessage(message: TransferMessage): TransferResponseCode {
  switch (message) {
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
    responseCode: determineResponseCodeFromMessage(message),
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

export function buildAdditionalDataFromKeyResolution(keyResolution: DifeKeyResponseDto): Record<string, string> {
  if (!keyResolution.key) {
    return {};
  }

  const key = keyResolution.key;
  const accountNumber = key.payment_method?.number;
  const accountType = key.payment_method?.type;
  const documentNumber = key.person?.identification?.number;
  const firstName = key.person?.name?.first_name;
  const secondName = key.person?.name?.second_name;
  const lastName = key.person?.name?.last_name;
  const secondLastName = key.person?.name?.second_last_name;
  const legalName = key.person?.legal_name;

  const obfuscatedName = buildObfuscatedName(firstName, secondName, lastName, secondLastName, legalName);

  return {
    ...(accountNumber && { ACCOUNT_NUMBER: accountNumber }),
    ...(accountType && { ACCOUNT_TYPE: accountType }),
    ...(documentNumber && { DOCUMENT_NUMBER: documentNumber }),
    ...(obfuscatedName && { OBFUSCATED_NAME: obfuscatedName })
  };
}

function buildObfuscatedName(
  firstName?: string,
  secondName?: string,
  lastName?: string,
  secondLastName?: string,
  legalName?: string
): string | null {
  if (legalName) {
    return obfuscateText(legalName);
  }

  const nameParts = [firstName, secondName, lastName, secondLastName].filter((part) => part && part.trim() !== '');

  if (nameParts.length === 0) {
    return null;
  }

  return nameParts.map((part) => obfuscateText(part)).join(' ');
}

function obfuscateText(text: string): string {
  if (!text || text.length <= 3) {
    return text;
  }

  const firstThree = text.slice(0, 3);
  const asterisks = '*'.repeat(text.length - 3);
  return `${firstThree}${asterisks}`;
}
