"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardizedResponseCodeMapper = void 0;
class StandardizedResponseCodeMapper {
    static mapLegacyToStandardized(legacyCode) {
        switch (legacyCode) {
            case 'SUCCESS':
                return 'SUCCESFUL';
            case 'ERROR':
                return 'ERROR';
            case 'VALIDATION_FAILED':
                return 'VALIDATION_FAILED';
            case 'APPROVED':
                return 'APPROVED';
            case 'PENDING':
                return 'PENDING';
            default:
                return 'ERROR';
        }
    }
    static determineResponseCode(networkCode) {
        if (!networkCode) {
            return 'ERROR';
        }
        const formatValidationErrors = ['DIFE-4000', 'DIFE-5005', 'DIFE-4001'];
        if (formatValidationErrors.includes(networkCode)) {
            return 'VALIDATION_FAILED';
        }
        const rejectionErrors = [
            'DIFE-0004',
            'DIFE-0005',
            'DIFE-0006',
            'DIFE-0001',
            'DIFE-0002',
            'DIFE-0003',
            'DIFE-0007',
            'DIFE-5012',
            'DIFE-5017'
        ];
        if (rejectionErrors.includes(networkCode)) {
            return 'REJECTED_BY_PROVIDER';
        }
        const providerErrors = ['DIFE-0008', 'DIFE-5001', 'DIFE-5003', 'DIFE-9999', 'DIFE-5000'];
        if (providerErrors.includes(networkCode) || networkCode.startsWith('DIFE-999')) {
            return 'PROVIDER_ERROR';
        }
        return 'ERROR';
    }
    static mapToHttpStatus(responseCode, networkCode) {
        switch (responseCode) {
            case 'SUCCESFUL':
                return 201;
            case 'APPROVED':
                return 200;
            case 'PENDING':
                return 201;
            case 'VALIDATION_FAILED':
                return 400;
            case 'REJECTED_BY_PROVIDER':
                if (networkCode === 'DIFE-0004') {
                    return 404;
                }
                return 422;
            case 'PROVIDER_ERROR':
                if (networkCode === 'DIFE-5000') {
                    return 504;
                }
                return 502;
            case 'ERROR':
                return 500;
            default:
                return 500;
        }
    }
}
exports.StandardizedResponseCodeMapper = StandardizedResponseCodeMapper;
//# sourceMappingURL=standardized-response-code.mapper.js.map