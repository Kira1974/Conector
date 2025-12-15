"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpbviReceptorDife = exports.PersonTypeDife = exports.PaymentMethodTypeDife = exports.KeyTypeDife = exports.KeyStatusDife = exports.IdentificationTypeDife = void 0;
var IdentificationTypeDife;
(function (IdentificationTypeDife) {
    IdentificationTypeDife["CITIZENSHIP_CARD"] = "CC";
    IdentificationTypeDife["FOREIGN_ID_CARD"] = "CE";
    IdentificationTypeDife["UNIQUE_PERSONAL_IDENTIFICATION_NUMBER"] = "NUIP";
    IdentificationTypeDife["TEMPORARY_PROTECTION_PERMIT"] = "PPT";
    IdentificationTypeDife["SPECIAL_PERMANENCE_PERMIT"] = "PEP";
    IdentificationTypeDife["PASSPORT"] = "PAS";
    IdentificationTypeDife["IDENTITY_CARD"] = "TDI";
    IdentificationTypeDife["TAX_IDENTIFICATION_NUMBER"] = "NIT";
})(IdentificationTypeDife || (exports.IdentificationTypeDife = IdentificationTypeDife = {}));
var KeyStatusDife;
(function (KeyStatusDife) {
    KeyStatusDife["ACTIVE"] = "ACTIVE";
    KeyStatusDife["BLOCKED_BY_PARTICIPANT"] = "BLOCKED_PARTICIPANT";
    KeyStatusDife["BLOCKED_BY_CLIENT"] = "BLOCKED_CLIENT";
})(KeyStatusDife || (exports.KeyStatusDife = KeyStatusDife = {}));
var KeyTypeDife;
(function (KeyTypeDife) {
    KeyTypeDife["IDENTIFICATION_NUMBER"] = "NRIC";
    KeyTypeDife["MOBILE_NUMBER"] = "M";
    KeyTypeDife["EMAIL"] = "E";
    KeyTypeDife["ALPHANUMERIC_IDENTIFIER"] = "O";
    KeyTypeDife["BUSINESS_CODE"] = "B";
})(KeyTypeDife || (exports.KeyTypeDife = KeyTypeDife = {}));
var PaymentMethodTypeDife;
(function (PaymentMethodTypeDife) {
    PaymentMethodTypeDife["SAVINGS_ACCOUNT"] = "CAHO";
    PaymentMethodTypeDife["CHECKING_ACCOUNT"] = "CCTE";
    PaymentMethodTypeDife["LOW_AMOUNT_DEPOSIT"] = "DBMO";
    PaymentMethodTypeDife["ORDINARY_DEPOSIT"] = "DORD";
    PaymentMethodTypeDife["INCLUSIVE_LOW_AMOUNT_DEPOSIT"] = "DBMI";
})(PaymentMethodTypeDife || (exports.PaymentMethodTypeDife = PaymentMethodTypeDife = {}));
var PersonTypeDife;
(function (PersonTypeDife) {
    PersonTypeDife["NATURAL_PERSON"] = "N";
    PersonTypeDife["LEGAL_PERSON"] = "L";
})(PersonTypeDife || (exports.PersonTypeDife = PersonTypeDife = {}));
var SpbviReceptorDife;
(function (SpbviReceptorDife) {
    SpbviReceptorDife["CREDIBANCO"] = "CRB";
    SpbviReceptorDife["TRANSFIYA"] = "TFY";
    SpbviReceptorDife["BETWEEN_ACCOUNTS"] = "ENT";
    SpbviReceptorDife["VISIONAMOS"] = "VIS";
    SpbviReceptorDife["SERVIBANCA"] = "SRV";
})(SpbviReceptorDife || (exports.SpbviReceptorDife = SpbviReceptorDife = {}));
//# sourceMappingURL=dife.enums.js.map