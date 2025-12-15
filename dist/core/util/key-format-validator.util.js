"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateKeyFormat = void 0;
const key_type_util_1 = require("./key-type.util");
function validateKeyFormat(keyValue, keyType) {
    if (!keyValue) {
        return {
            isValid: false,
            errorMessage: 'Key value cannot be empty'
        };
    }
    const length = keyValue.length;
    if (keyType === key_type_util_1.KeyType.OTHERS) {
        if (length < 6 || length > 21) {
            return {
                isValid: false,
                errorMessage: 'Key value must be between 6 and 21 characters for alphanumeric identifier type'
            };
        }
        if (!keyValue.startsWith('@')) {
            return {
                isValid: false,
                errorMessage: 'Alphanumeric identifier key must start with @'
            };
        }
        if (!/^[A-Z0-9@]+$/.test(keyValue)) {
            return {
                isValid: false,
                errorMessage: 'Key value must contain only uppercase letters, numbers, and @ symbol'
            };
        }
    }
    if (keyType === key_type_util_1.KeyType.MOVIL) {
        if (length !== 10 || !/^\d+$/.test(keyValue) || !keyValue.startsWith('3')) {
            return {
                isValid: false,
                errorMessage: 'Mobile number key must be 10 digits starting with 3'
            };
        }
    }
    if (keyType === key_type_util_1.KeyType.EMAIL) {
        if (!keyValue.includes('@') || keyValue.startsWith('@')) {
            return {
                isValid: false,
                errorMessage: 'Email key must contain @ symbol and not start with @'
            };
        }
        const [localPart, domainPart] = keyValue.split('@');
        if (!localPart || localPart.length > 30 || !domainPart || domainPart.length > 61 || length < 3 || length > 92) {
            return {
                isValid: false,
                errorMessage: 'Email key format is invalid'
            };
        }
    }
    if (keyType === key_type_util_1.KeyType.COMMERCE_CODE) {
        if (length !== 10 || !keyValue.startsWith('00')) {
            return {
                isValid: false,
                errorMessage: 'Commerce code key must be 10 digits starting with 00'
            };
        }
    }
    if (keyType === key_type_util_1.KeyType.NRIC) {
        if (length < 1 || length > 18) {
            return {
                isValid: false,
                errorMessage: 'Identification number key must be between 1 and 18 characters'
            };
        }
        if (!/^[A-Z0-9]+$/.test(keyValue)) {
            return {
                isValid: false,
                errorMessage: 'Identification number key must contain only uppercase letters and numbers'
            };
        }
    }
    return { isValid: true };
}
exports.validateKeyFormat = validateKeyFormat;
//# sourceMappingURL=key-format-validator.util.js.map