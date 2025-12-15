"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodTypeMol = exports.originTypeMol = exports.BillingResponsibleMol = exports.KeyTypeMol = exports.IdentificationTypeMol = void 0;
var IdentificationTypeMol;
(function (IdentificationTypeMol) {
    IdentificationTypeMol["CITIZENSHIP_ID"] = "CITIZENSHIP_ID";
    IdentificationTypeMol["FOREIGNER_ID"] = "FOREIGNER_ID";
    IdentificationTypeMol["TAX_ID"] = "TAX_ID";
    IdentificationTypeMol["PERSONAL_ID"] = "PERSONAL_ID";
    IdentificationTypeMol["TEMPORARY_PROTECTION_ID"] = "TEMPORARY_PROTECTION_ID";
    IdentificationTypeMol["SPECIAL_RESIDENCE_ID"] = "SPECIAL_RESIDENCE_ID";
    IdentificationTypeMol["PASSPORT"] = "PASSPORT";
    IdentificationTypeMol["IDENTITY_CARD"] = "IDENTITY_CARD";
})(IdentificationTypeMol || (exports.IdentificationTypeMol = IdentificationTypeMol = {}));
var KeyTypeMol;
(function (KeyTypeMol) {
    KeyTypeMol["IDENTIFICATION"] = "IDENTIFICATION";
    KeyTypeMol["MAIL"] = "MAIL";
    KeyTypeMol["PHONE"] = "PHONE";
    KeyTypeMol["ALPHANUMERIC"] = "ALPHANUMERIC";
    KeyTypeMol["MERCHANT_CODE"] = "MERCHANT_CODE";
})(KeyTypeMol || (exports.KeyTypeMol = KeyTypeMol = {}));
var BillingResponsibleMol;
(function (BillingResponsibleMol) {
    BillingResponsibleMol["DEBT"] = "DEBT";
    BillingResponsibleMol["CRED"] = "CRED";
    BillingResponsibleMol["SHAR"] = "SHAR";
    BillingResponsibleMol["SLEV"] = "SLEV";
})(BillingResponsibleMol || (exports.BillingResponsibleMol = BillingResponsibleMol = {}));
var originTypeMol;
(function (originTypeMol) {
    originTypeMol["QR_STATIC"] = "QR_STATIC";
    originTypeMol["QR_DYNAMIC"] = "QR_DYNAMIC";
    originTypeMol["KEY"] = "KEY";
})(originTypeMol || (exports.originTypeMol = originTypeMol = {}));
var PaymentMethodTypeMol;
(function (PaymentMethodTypeMol) {
    PaymentMethodTypeMol["SAVINGS_ACCOUNT"] = "SAVINGS_ACCOUNT";
    PaymentMethodTypeMol["CHECKING_ACCOUNT"] = "CHECKING_ACCOUNT";
    PaymentMethodTypeMol["LOW_AMOUNT_DEPOSIT"] = "LOW_AMOUNT_DEPOSIT";
    PaymentMethodTypeMol["INCLUSIVE_AMOUNT_DEPOSIT"] = "INCLUSIVE_AMOUNT_DEPOSIT";
    PaymentMethodTypeMol["REGULAR_DEPOSIT"] = "REGULAR_DEPOSIT";
})(PaymentMethodTypeMol || (exports.PaymentMethodTypeMol = PaymentMethodTypeMol = {}));
//# sourceMappingURL=mol.enums.js.map