"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNetworkErrorInfo = void 0;
const error_constants_util_1 = require("./error-constants.util");
const KEYMGMT_KEYWORD = 'keymgmt';
const DIFE_KEYWORD = 'DIFE';
const PAYMENT_KEYWORD = 'payment';
const MOL_KEYWORD = 'mol';
const NETWORK_KEYWORD = 'network';
const CONNECTION_KEYWORD = 'connection';
function extractNetworkErrorInfo(errorMessage) {
    if (!errorMessage) {
        return null;
    }
    const difeError = extractDifeError(errorMessage);
    if (difeError) {
        return difeError;
    }
    const molErrorCode = extractMolErrorCode(errorMessage);
    if (molErrorCode) {
        return molErrorCode;
    }
    const molError = extractMolError(errorMessage);
    if (molError) {
        return molError;
    }
    const molCodeOnly = extractMolCodeOnly(errorMessage);
    if (molCodeOnly) {
        return molCodeOnly;
    }
    const externalServiceError = extractExternalServiceError(errorMessage);
    if (externalServiceError) {
        return externalServiceError;
    }
    const httpStatusError = extractHttpStatusError(errorMessage);
    if (httpStatusError) {
        return httpStatusError;
    }
    const jsonError = extractJsonError(errorMessage);
    if (jsonError) {
        return jsonError;
    }
    return extractErrorByKeywords(errorMessage);
}
exports.extractNetworkErrorInfo = extractNetworkErrorInfo;
function extractDifeError(errorMessage) {
    const difeErrorPattern = /DIFE API error: (.+?) \((DIFE-\d{4})\)/;
    const difeMatch = errorMessage.match(difeErrorPattern);
    if (difeMatch) {
        return {
            code: difeMatch[2],
            description: difeMatch[1],
            source: error_constants_util_1.ERROR_SOURCE_DIFE
        };
    }
    return null;
}
function extractMolErrorCode(errorMessage) {
    const molErrorCodePattern = /(MOL-\d{4}):\s*(.+?)(?:,|$)/;
    const molErrorCodeMatch = errorMessage.match(molErrorCodePattern);
    if (molErrorCodeMatch) {
        return {
            code: molErrorCodeMatch[1],
            description: molErrorCodeMatch[2].trim(),
            source: error_constants_util_1.ERROR_SOURCE_MOL
        };
    }
    return null;
}
function extractMolError(errorMessage) {
    const molErrorPattern = /Payment processing failed: (.+?)(?: \(HTTP (\d+)\))?$/;
    const molMatch = errorMessage.match(molErrorPattern);
    if (molMatch) {
        const description = molMatch[1];
        const codeFromDescription = description.match(/^(\d{3}):\s*(.+)$/);
        if (codeFromDescription) {
            return {
                code: codeFromDescription[1],
                description: codeFromDescription[2],
                source: error_constants_util_1.ERROR_SOURCE_MOL
            };
        }
        return {
            code: molMatch[2] || undefined,
            description,
            source: error_constants_util_1.ERROR_SOURCE_MOL
        };
    }
    return null;
}
function extractMolCodeOnly(errorMessage) {
    const molCodePattern = /^(\d{3}):\s*(.+)$/;
    const molCodeMatch = errorMessage.match(molCodePattern);
    if (molCodeMatch) {
        return {
            code: molCodeMatch[1],
            description: molCodeMatch[2],
            source: error_constants_util_1.ERROR_SOURCE_MOL
        };
    }
    return null;
}
function extractExternalServiceError(errorMessage) {
    const externalServicePattern = /External service error in .+?: (.+?)(?: \((\w+)\))?/;
    const externalMatch = errorMessage.match(externalServicePattern);
    if (externalMatch) {
        const source = determineSourceFromMessage(errorMessage);
        return {
            code: externalMatch[2] || undefined,
            description: externalMatch[1],
            source
        };
    }
    return null;
}
function extractHttpStatusError(errorMessage) {
    const httpStatusPattern = /(?:status code|http)\s+(\d{3})/i;
    const httpMatch = errorMessage.match(httpStatusPattern);
    if (httpMatch) {
        const httpCode = httpMatch[1];
        const source = determineSourceFromMessage(errorMessage);
        return {
            code: httpCode,
            description: `Request failed with status code ${httpCode}`,
            source
        };
    }
    return null;
}
function extractJsonError(errorMessage) {
    const jsonErrorPattern = /"error"\s*:\s*"([^"]+)"/;
    const jsonMatch = errorMessage.match(jsonErrorPattern);
    if (jsonMatch) {
        const jsonError = jsonMatch[1];
        const httpCodeMatch = jsonError.match(/(?:status code|http)\s+(\d{3})/i);
        if (httpCodeMatch) {
            const httpCode = httpCodeMatch[1];
            const source = determineSourceFromMessage(errorMessage);
            return {
                code: httpCode,
                description: jsonError,
                source
            };
        }
    }
    return null;
}
function extractErrorByKeywords(errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();
    if (lowerMessage.includes(PAYMENT_KEYWORD) || lowerMessage.includes(MOL_KEYWORD)) {
        return {
            code: undefined,
            description: errorMessage,
            source: error_constants_util_1.ERROR_SOURCE_MOL
        };
    }
    if (lowerMessage.includes(NETWORK_KEYWORD) || lowerMessage.includes(CONNECTION_KEYWORD)) {
        return {
            code: undefined,
            description: errorMessage,
            source: error_constants_util_1.ERROR_SOURCE_MOL
        };
    }
    if (lowerMessage.includes(KEYMGMT_KEYWORD) || lowerMessage.includes(DIFE_KEYWORD.toLowerCase())) {
        return {
            code: undefined,
            description: errorMessage,
            source: error_constants_util_1.ERROR_SOURCE_DIFE
        };
    }
    return null;
}
function determineSourceFromMessage(errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();
    return lowerMessage.includes(KEYMGMT_KEYWORD) || lowerMessage.includes(DIFE_KEYWORD.toLowerCase())
        ? error_constants_util_1.ERROR_SOURCE_DIFE
        : error_constants_util_1.ERROR_SOURCE_MOL;
}
//# sourceMappingURL=network-error-extractor.util.js.map