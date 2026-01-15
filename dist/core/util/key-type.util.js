"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateKeyType = exports.KeyType = void 0;
var KeyType;
(function (KeyType) {
    KeyType["NRIC"] = "NRIC";
    KeyType["MOVIL"] = "M";
    KeyType["EMAIL"] = "E";
    KeyType["OTHERS"] = "O";
    KeyType["COMMERCE_CODE"] = "B";
})(KeyType || (exports.KeyType = KeyType = {}));
function calculateKeyType(keyValue) {
    const length = keyValue.length;
    const isNumeric = /^\d+$/.test(keyValue);
    if (length === 10 && keyValue.startsWith('00') && isNumeric) {
        return KeyType.COMMERCE_CODE;
    }
    if (length === 10 && isNumeric && keyValue.startsWith('3')) {
        return KeyType.MOVIL;
    }
    if (keyValue.includes('@') && !keyValue.startsWith('@')) {
        const [localPart, domainPart] = keyValue.split('@');
        if (localPart && localPart.length <= 30 && domainPart && domainPart.length <= 61 && length >= 3 && length <= 92) {
            return KeyType.EMAIL;
        }
    }
    if (keyValue.startsWith('@') && length >= 6 && length <= 21) {
        return KeyType.OTHERS;
    }
    if (length >= 1 && length <= 18) {
        return KeyType.NRIC;
    }
    return KeyType.OTHERS;
}
exports.calculateKeyType = calculateKeyType;
//# sourceMappingURL=key-type.util.js.map