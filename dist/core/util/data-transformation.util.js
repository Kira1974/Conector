"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.obfuscateKey = exports.maskAccountNumber = exports.obfuscateName = exports.obfuscateWord = exports.buildAdditionalDataFromKeyResolution = void 0;
const additional_data_key_enum_1 = require("../model/additional-data-key.enum");
function buildAdditionalDataFromKeyResolution(keyResolution) {
    const key = keyResolution.key;
    if (!key?.person || !key?.payment_method) {
        return {};
    }
    const documentNumber = key.person.identification?.number || '';
    const name = buildName(key.person);
    const accountNumber = key.payment_method.number || '';
    const accountType = key.payment_method.type || '';
    return {
        [additional_data_key_enum_1.AdditionalDataKey.DOCUMENT_NUMBER]: documentNumber,
        [additional_data_key_enum_1.AdditionalDataKey.NAME]: name,
        [additional_data_key_enum_1.AdditionalDataKey.ACCOUNT_NUMBER]: accountNumber,
        [additional_data_key_enum_1.AdditionalDataKey.ACCOUNT_TYPE]: accountType
    };
}
exports.buildAdditionalDataFromKeyResolution = buildAdditionalDataFromKeyResolution;
function buildName(person) {
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
function obfuscateWord(word) {
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
exports.obfuscateWord = obfuscateWord;
function obfuscateName(name) {
    if (!name || name.trim() === '') {
        return '';
    }
    const parts = name.split(' ').filter(Boolean);
    return parts.map((part) => obfuscateWord(part)).join(' ');
}
exports.obfuscateName = obfuscateName;
function maskAccountNumber(accountNumber) {
    if (!accountNumber) {
        return '';
    }
    const lastSix = accountNumber.slice(-6);
    const maskedPrefixLength = Math.max(accountNumber.length - 6, 0);
    const maskedPrefix = '*'.repeat(maskedPrefixLength);
    return `${maskedPrefix}${lastSix}`;
}
exports.maskAccountNumber = maskAccountNumber;
function buildMaskedAccountNumber(accountNumber) {
    return maskAccountNumber(accountNumber);
}
function obfuscateKey(value, charsToMask = 3) {
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
exports.obfuscateKey = obfuscateKey;
//# sourceMappingURL=data-transformation.util.js.map