import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

import { AdditionalDataKey } from '../model/additional-data-key.enum';

export function buildAdditionalDataFromKeyResolution(keyResolution: DifeKeyResponseDto): Record<string, string> {
  const key = keyResolution.key;
  if (!key?.person || !key?.payment_method) {
    return {};
  }

  const documentNumber = key.person.identification?.number || '';
  const name = buildName(key.person);
  const accountNumber = key.payment_method.number || '';
  const accountType = key.payment_method.type || '';

  return {
    [AdditionalDataKey.DOCUMENT_NUMBER]: documentNumber,
    [AdditionalDataKey.NAME]: name,
    [AdditionalDataKey.ACCOUNT_NUMBER]: accountNumber,
    [AdditionalDataKey.ACCOUNT_TYPE]: accountType
  };
}

function buildName(person: DifeKeyResponseDto['key']['person']): string {
  if (!person.name) {
    return person.legal_name || '';
  }

  const nameParts = [
    person.name.first_name,
    person.name.second_name,
    person.name.last_name,
    person.name.second_last_name
  ].filter((part) => part && part.length > 0);

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

export function obfuscateKey(value: string, charsToMask: number = 3): string {
  if (!value || value.length === 0) {
    return '';
  }

  if (value.length <= charsToMask) {
    const asterisks = '*'.repeat(Math.max(0, value.length - 1));
    const lastChar = value.length > 0 ? value.slice(-1) : '';
    return `${asterisks}${lastChar}`;
  }

  const masked = '*'.repeat(charsToMask);
  const visible = value.slice(charsToMask);

  return `${masked}${visible}`;
}
