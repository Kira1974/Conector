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

export function obfuscateWord(word: string): string {
  if (!word) {
    return '';
  }

  if (word.length === 1) {
    return word;
  }

  if (word.length <= 3) {
    const prefix = word.slice(0, word.length - 1);
    return `${prefix}*`;
  }

  const prefix = word.slice(0, 3);
  const maskedLength = word.length - 3;
  const maskedSuffix = '*'.repeat(maskedLength);
  return `${prefix}${maskedSuffix}`;
}

export function obfuscateName(name: string): string {
  if (!name || name.trim() === '') {
    return '';
  }

  const parts = name.split(' ').filter(Boolean);
  return parts.map((part) => obfuscateWord(part)).join(' ');
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) {
    return '';
  }

  const lastSix = accountNumber.slice(-6);
  const maskedPrefixLength = Math.max(accountNumber.length - 6, 0);
  const maskedPrefix = '*'.repeat(maskedPrefixLength);
  return `${maskedPrefix}${lastSix}`;
}

function buildMaskedAccountNumber(accountNumber: string): string {
  return maskAccountNumber(accountNumber);
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

export interface ParsedPayeeName {
  firstName?: string;
  secondName?: string;
  lastName?: string;
  secondLastName?: string;
  legalName?: string;
}

export function parsePayeeName(payeeName?: string): ParsedPayeeName {
  if (!payeeName || payeeName.trim() === '') {
    return {};
  }

  const parts = payeeName.trim().split(/\s+/);

  if (parts.length === 1) {
    return { legalName: parts[0] };
  }

  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  }

  if (parts.length === 3) {
    return { firstName: parts[0], lastName: parts[1], secondLastName: parts[2] };
  }

  if (parts.length >= 4) {
    return {
      firstName: parts[0],
      secondName: parts[1],
      lastName: parts[2],
      secondLastName: parts[3]
    };
  }

  return {};
}
