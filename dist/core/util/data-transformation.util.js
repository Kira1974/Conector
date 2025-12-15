"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdditionalDataFromKeyResolution = void 0;
const additional_data_key_enum_1 = require("../model/additional-data-key.enum");
function buildAdditionalDataFromKeyResolution(keyResolution) {
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
        [additional_data_key_enum_1.AdditionalDataKey.DOCUMENT_NUMBER]: documentNumber,
        [additional_data_key_enum_1.AdditionalDataKey.OBFUSCATED_NAME]: obfuscatedName,
        [additional_data_key_enum_1.AdditionalDataKey.ACCOUNT_NUMBER]: maskedAccountNumber,
        [additional_data_key_enum_1.AdditionalDataKey.ACCOUNT_TYPE]: accountType
    };
}
exports.buildAdditionalDataFromKeyResolution = buildAdditionalDataFromKeyResolution;
function buildObfuscatedName(person) {
    const nameParts = [person.firstName, person.secondName, person.lastName, person.secondLastName]
        .map((part) => obfuscateWord(part || ''))
        .filter((obfuscated) => obfuscated.length > 0);
    return nameParts.join(' ');
}
function obfuscateWord(word) {
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
function buildMaskedAccountNumber(accountNumber) {
    if (!accountNumber) {
        return '';
    }
    const lastSix = accountNumber.slice(-6);
    const maskedPrefixLength = Math.max(accountNumber.length - 6, 0);
    const maskedPrefix = '*'.repeat(maskedPrefixLength);
    return `${maskedPrefix}${lastSix}`;
}
//# sourceMappingURL=data-transformation.util.js.map