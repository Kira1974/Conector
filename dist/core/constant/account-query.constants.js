"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifeErrorCodes = exports.AccountQueryState = void 0;
var AccountQueryState;
(function (AccountQueryState) {
    AccountQueryState["SUCCESSFUL"] = "SUCCESSFUL";
    AccountQueryState["VALIDATION_FAILED"] = "VALIDATION_FAILED";
    AccountQueryState["REJECTED_BY_PROVIDER"] = "REJECTED_BY_PROVIDER";
    AccountQueryState["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    AccountQueryState["ERROR"] = "ERROR";
})(AccountQueryState || (exports.AccountQueryState = AccountQueryState = {}));
exports.DifeErrorCodes = {
    FORMAT_VALIDATION: ['DIFE-4000', 'DIFE-5005'],
    BUSINESS_VALIDATION: [
        'DIFE-0004',
        'DIFE-0005',
        'DIFE-0006',
        'DIFE-4001',
        'DIFE-5009',
        'DIFE-5012',
        'DIFE-5017'
    ],
    SERVICE_ERROR: ['DIFE-0008', 'DIFE-5000', 'DIFE-5001', 'DIFE-5003', 'DIFE-9999']
};
//# sourceMappingURL=account-query.constants.js.map