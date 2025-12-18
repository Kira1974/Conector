import { AdditionalDataKey } from '../model/additional-data-key.enum';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

export function buildAdditionalDataFromKeyResolution(keyResolution: DifeKeyResponseDto): Record<string, string> {
  const key = keyResolution.key;
  if (!key?.person || !key?.payment_method) {
    return {};
  }

  const documentNumber = key.person.identification?.number || '';
  const obfuscatedName = buildObfuscatedName(key.person);
  const accountNumber = key.payment_method.number || '';
  const maskedAccountNumber = buildMaskedAccountNumber(accountNumber);
  const accountType = key.payment_method.type || '';

  return {
    [AdditionalDataKey.DOCUMENT_NUMBER]: documentNumber,
    [AdditionalDataKey.OBFUSCATED_NAME]: obfuscatedName,
    [AdditionalDataKey.ACCOUNT_NUMBER]: maskedAccountNumber,
    [AdditionalDataKey.ACCOUNT_TYPE]: accountType
  };
}

function buildObfuscatedName(person: DifeKeyResponseDto['key']['person']): string {
  if (!person.name) {
    return '';
  }

  const nameParts = [
    person.name.first_name,
    person.name.second_name,
    person.name.last_name,
    person.name.second_last_name
  ]
    .map((part) => obfuscateWord(part || ''))
    .filter((obfuscated) => obfuscated.length > 0);

  return nameParts.join(' ');
}

function obfuscateWord(word: string): string {
  if (!word) {
    return '';
  }

  const prefix = word.slice(0, 3);
  if (word.length <= 3) {
    return prefix;
  }

  const maskedLength = word.length - 3;
  const maskedSuffix = '*'.repeat(maskedLength);
  return `${prefix}${maskedSuffix}`;
}

function buildMaskedAccountNumber(accountNumber: string): string {
  if (!accountNumber) {
    return '';
  }

  const lastSix = accountNumber.slice(-6);
  const maskedPrefixLength = Math.max(accountNumber.length - 6, 0);
  const maskedPrefix = '*'.repeat(maskedPrefixLength);
  return `${maskedPrefix}${lastSix}`;
}
