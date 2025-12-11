import { KeyResolutionResponse } from '../model';
import { AdditionalDataKey } from '../model/additional-data-key.enum';

export function buildAdditionalDataFromKeyResolution(keyResolution: KeyResolutionResponse): Record<string, string> {
  const resolvedKey = keyResolution.resolvedKey;
  if (!resolvedKey) {
    return {};
  }

  const documentNumber = resolvedKey.person.identificationNumber || '';
  const obfuscatedName = buildObfuscatedName(resolvedKey.person);
  const accountNumber = resolvedKey.paymentMethod.number || '';
  const maskedAccountNumber = buildMaskedAccountNumber(accountNumber);
  const accountType = resolvedKey.paymentMethod.type || '';

  return {
    [AdditionalDataKey.DOCUMENT_NUMBER]: documentNumber,
    [AdditionalDataKey.OBFUSCATED_NAME]: obfuscatedName,
    [AdditionalDataKey.ACCOUNT_NUMBER]: maskedAccountNumber,
    [AdditionalDataKey.ACCOUNT_TYPE]: accountType
  };
}

function buildObfuscatedName(person: KeyResolutionResponse['resolvedKey']['person']): string {
  const nameParts = [person.firstName, person.secondName, person.lastName, person.secondLastName]
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
