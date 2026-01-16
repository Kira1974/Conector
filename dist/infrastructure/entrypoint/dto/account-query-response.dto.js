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
exports.AccountQueryResponseDto = exports.AccountQueryDataDto = exports.UserDataDto = exports.AccountInfoDto = exports.AccountDetailDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class AccountDetailDto {
}
exports.AccountDetailDto = AccountDetailDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Key value', example: '3001234567' }),
    __metadata("design:type", String)
], AccountDetailDto.prototype, "KEY_VALUE", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DIFE correlation ID', example: '800227747ca675da18c35c11528d44c9f2aa22cf6a410' }),
    __metadata("design:type", String)
], AccountDetailDto.prototype, "BREB_DIFE_CORRELATION_ID", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DIFE trace ID', example: '212121' }),
    __metadata("design:type", String)
], AccountDetailDto.prototype, "BREB_DIFE_TRACE_ID", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'DIFE execution ID', example: '800227747ca675da18c35c11528d44c9f2aa22cf6a410' }),
    __metadata("design:type", String)
], AccountDetailDto.prototype, "BREB_DIFE_EXECUTION_ID", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Key type', example: 'M', enum: ['M', 'E', 'O', 'B', 'NRIC'] }),
    __metadata("design:type", String)
], AccountDetailDto.prototype, "BREB_KEY_TYPE", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Participant NIT', example: '900123456' }),
    __metadata("design:type", String)
], AccountDetailDto.prototype, "BREB_PARTICIPANT_NIT", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Participant SPBVI code', example: 'CRED' }),
    __metadata("design:type", String)
], AccountDetailDto.prototype, "BREB_PARTICIPANT_SPBVI", void 0);
class AccountInfoDto {
}
exports.AccountInfoDto = AccountInfoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account type', example: 'CAHO', enum: ['CAHO', 'CAAH'] }),
    __metadata("design:type", String)
], AccountInfoDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account number (not obfuscated)', example: '123123123123' }),
    __metadata("design:type", String)
], AccountInfoDto.prototype, "number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Additional account details', type: AccountDetailDto }),
    __metadata("design:type", AccountDetailDto)
], AccountInfoDto.prototype, "detail", void 0);
class UserDataDto {
}
exports.UserDataDto = UserDataDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Person full name (not obfuscated)', example: 'Juan Carlos Perez Gomez' }),
    __metadata("design:type", String)
], UserDataDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Person type', example: 'N', enum: ['N', 'J'] }),
    __metadata("design:type", String)
], UserDataDto.prototype, "personType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document type', example: 'CC' }),
    __metadata("design:type", String)
], UserDataDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document number', example: '1234567890' }),
    __metadata("design:type", String)
], UserDataDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account information', type: AccountInfoDto }),
    __metadata("design:type", AccountInfoDto)
], UserDataDto.prototype, "account", void 0);
class AccountQueryDataDto {
}
exports.AccountQueryDataDto = AccountQueryDataDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'External transaction ID from DIFE', example: 'dife-execution-id' }),
    __metadata("design:type", String)
], AccountQueryDataDto.prototype, "externalTransactionId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Transaction state',
        example: 'SUCCESFUL',
        enum: ['SUCCESFUL', 'VALIDATION_FAILED', 'REJECTED_BY_PROVIDER', 'PROVIDER_ERROR', 'ERROR']
    }),
    __metadata("design:type", String)
], AccountQueryDataDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User data with account information', type: UserDataDto }),
    __metadata("design:type", UserDataDto)
], AccountQueryDataDto.prototype, "userData", void 0);
class AccountQueryResponseDto {
}
exports.AccountQueryResponseDto = AccountQueryResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response code', example: '201' }),
    __metadata("design:type", String)
], AccountQueryResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response message', example: 'Account query successful' }),
    __metadata("design:type", String)
], AccountQueryResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response data', type: AccountQueryDataDto, required: false }),
    __metadata("design:type", AccountQueryDataDto)
], AccountQueryResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Network error code', required: false, example: 'DIFE-4000' }),
    __metadata("design:type", String)
], AccountQueryResponseDto.prototype, "networkCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Network error message', required: false }),
    __metadata("design:type", String)
], AccountQueryResponseDto.prototype, "networkMessage", void 0);
//# sourceMappingURL=account-query-response.dto.js.map