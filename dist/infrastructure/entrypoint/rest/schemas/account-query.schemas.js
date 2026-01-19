"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountQueryErrorResponseSchema = exports.AccountQuerySuccessResponseSchema = exports.AccountQueryErrorDataSchema = exports.AccountQuerySuccessDataSchema = exports.UserDataSchema = exports.AccountInfoSchema = exports.AccountDetailSchema = exports.AccountQueryRequestSchema = exports.AccountSchema = void 0;
const swagger_1 = require("@nestjs/swagger");
class AccountSchema {
}
exports.AccountSchema = AccountSchema;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Account type - BREB for Bre-B key resolution',
        example: 'BREB',
        enum: ['BREB']
    }),
    __metadata("design:type", String)
], AccountSchema.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The key value to resolve (mobile, email, alphanumeric, etc.)',
        example: '3001234567'
    }),
    __metadata("design:type", String)
], AccountSchema.prototype, "value", void 0);
class AccountQueryRequestSchema {
}
exports.AccountQueryRequestSchema = AccountQueryRequestSchema;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Account information containing the key to resolve',
        type: AccountSchema
    }),
    __metadata("design:type", AccountSchema)
], AccountQueryRequestSchema.prototype, "account", void 0);
class AccountDetailSchema {
}
exports.AccountDetailSchema = AccountDetailSchema;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Key value', example: '3001234567' }),
    __metadata("design:type", String)
], AccountDetailSchema.prototype, "KEY_VALUE", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DIFE correlation ID', example: '800227747ca675da18c35c11528d44c9f2aa22cf6a410' }),
    __metadata("design:type", String)
], AccountDetailSchema.prototype, "BREB_DIFE_CORRELATION_ID", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DIFE trace ID', example: '212121' }),
    __metadata("design:type", String)
], AccountDetailSchema.prototype, "BREB_DIFE_TRACE_ID", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'DIFE execution ID',
        example: '800227747ca675da18c35c11528d44c9f2aa22cf6a410',
        required: false
    }),
    __metadata("design:type", String)
], AccountDetailSchema.prototype, "BREB_DIFE_EXECUTION_ID", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Key type', example: 'M', enum: ['M', 'E', 'O', 'B', 'NRIC'] }),
    __metadata("design:type", String)
], AccountDetailSchema.prototype, "BREB_KEY_TYPE", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Participant NIT', example: '900123456' }),
    __metadata("design:type", String)
], AccountDetailSchema.prototype, "BREB_PARTICIPANT_NIT", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Participant SPBVI code', example: 'CRED' }),
    __metadata("design:type", String)
], AccountDetailSchema.prototype, "BREB_PARTICIPANT_SPBVI", void 0);
class AccountInfoSchema {
}
exports.AccountInfoSchema = AccountInfoSchema;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account type', example: 'CAHO', enum: ['CAHO', 'CAAH'] }),
    __metadata("design:type", String)
], AccountInfoSchema.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account number (not obfuscated)', example: '123123123123' }),
    __metadata("design:type", String)
], AccountInfoSchema.prototype, "number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Additional account details', type: AccountDetailSchema }),
    __metadata("design:type", AccountDetailSchema)
], AccountInfoSchema.prototype, "detail", void 0);
class UserDataSchema {
}
exports.UserDataSchema = UserDataSchema;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Person full name (not obfuscated)', example: 'Juan Carlos Perez Gomez' }),
    __metadata("design:type", String)
], UserDataSchema.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Person type', example: 'N', enum: ['N', 'J'] }),
    __metadata("design:type", String)
], UserDataSchema.prototype, "personType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document type', example: 'CC' }),
    __metadata("design:type", String)
], UserDataSchema.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document number', example: '1234567890' }),
    __metadata("design:type", String)
], UserDataSchema.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account information', type: AccountInfoSchema }),
    __metadata("design:type", AccountInfoSchema)
], UserDataSchema.prototype, "account", void 0);
class AccountQuerySuccessDataSchema {
}
exports.AccountQuerySuccessDataSchema = AccountQuerySuccessDataSchema;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'External transaction ID from DIFE', example: 'dife-execution-id' }),
    __metadata("design:type", String)
], AccountQuerySuccessDataSchema.prototype, "externalTransactionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction state',
        example: 'SUCCESFUL',
        enum: ['SUCCESFUL', 'VALIDATION_FAILED', 'REJECTED_BY_PROVIDER', 'PROVIDER_ERROR', 'ERROR']
    }),
    __metadata("design:type", String)
], AccountQuerySuccessDataSchema.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User data with account information', type: UserDataSchema }),
    __metadata("design:type", UserDataSchema)
], AccountQuerySuccessDataSchema.prototype, "userData", void 0);
class AccountQueryErrorDataSchema {
}
exports.AccountQueryErrorDataSchema = AccountQueryErrorDataSchema;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Network error code', example: 'DIFE-4000', required: false }),
    __metadata("design:type", String)
], AccountQueryErrorDataSchema.prototype, "networkCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Network error message',
        example: 'DIFE: Invalid key format (DIFE-4000)',
        required: false
    }),
    __metadata("design:type", String)
], AccountQueryErrorDataSchema.prototype, "networkMessage", void 0);
class AccountQuerySuccessResponseSchema {
}
exports.AccountQuerySuccessResponseSchema = AccountQuerySuccessResponseSchema;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response code (numeric)', example: 201, type: 'number' }),
    __metadata("design:type", Number)
], AccountQuerySuccessResponseSchema.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message', example: 'Key resolved successfully' }),
    __metadata("design:type", String)
], AccountQuerySuccessResponseSchema.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response data', type: AccountQuerySuccessDataSchema }),
    __metadata("design:type", AccountQuerySuccessDataSchema)
], AccountQuerySuccessResponseSchema.prototype, "data", void 0);
class AccountQueryErrorResponseSchema {
}
exports.AccountQueryErrorResponseSchema = AccountQueryErrorResponseSchema;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response code (numeric)', example: 400, type: 'number' }),
    __metadata("design:type", Number)
], AccountQueryErrorResponseSchema.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message', example: 'Invalid key format' }),
    __metadata("design:type", String)
], AccountQueryErrorResponseSchema.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Error data with network information', type: AccountQueryErrorDataSchema }),
    __metadata("design:type", AccountQueryErrorDataSchema)
], AccountQueryErrorResponseSchema.prototype, "data", void 0);
//# sourceMappingURL=account-query.schemas.js.map