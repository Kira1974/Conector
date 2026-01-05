"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdditionalDataFromKeyResolution = void 0;
const additional_data_key_enum_1 = require("../model/additional-data-key.enum");
function buildAdditionalDataFromKeyResolution(keyResolution) {
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
        [additional_data_key_enum_1.AdditionalDataKey.DOCUMENT_NUMBER]: documentNumber,
        [additional_data_key_enum_1.AdditionalDataKey.OBFUSCATED_NAME]: obfuscatedName,
        [additional_data_key_enum_1.AdditionalDataKey.ACCOUNT_NUMBER]: maskedAccountNumber,
        [additional_data_key_enum_1.AdditionalDataKey.ACCOUNT_TYPE]: accountType
    };
}
exports.buildAdditionalDataFromKeyResolution = buildAdditionalDataFromKeyResolution;
function buildObfuscatedName(person) {
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