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
exports.TransferRequestDto = exports.TransactionDto = exports.AdditionalDataDto = exports.PayeeDto = exports.PayeeAccountDto = exports.PayeeAccountDetailDto = exports.PayerDto = exports.PayerAccountDto = exports.AmountDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class AmountDto {
}
exports.AmountDto = AmountDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], AmountDto.prototype, "total", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(['COP', 'USD', 'EUR']),
    __metadata("design:type", String)
], AmountDto.prototype, "currency", void 0);
class PayerAccountDto {
}
exports.PayerAccountDto = PayerAccountDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PayerAccountDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PayerAccountDto.prototype, "number", void 0);
class PayerDto {
}
exports.PayerDto = PayerDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PayerAccountDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", PayerAccountDto)
], PayerDto.prototype, "account", void 0);
class PayeeAccountDetailDto {
}
exports.PayeeAccountDetailDto = PayeeAccountDetailDto;
class PayeeAccountDto {
}
exports.PayeeAccountDto = PayeeAccountDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PayeeAccountDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PayeeAccountDto.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", PayeeAccountDetailDto)
], PayeeAccountDto.prototype, "detail", void 0);
class PayeeDto {
}
exports.PayeeDto = PayeeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PayeeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PayeeDto.prototype, "personType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PayeeDto.prototype, "documentType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PayeeDto.prototype, "documentNumber", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PayeeAccountDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", PayeeAccountDto)
], PayeeDto.prototype, "account", void 0);
class AdditionalDataDto {
}
exports.AdditionalDataDto = AdditionalDataDto;
class TransactionDto {
}
exports.TransactionDto = TransactionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransactionDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AmountDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", AmountDto)
], TransactionDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransactionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PayerDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", PayerDto)
], TransactionDto.prototype, "payer", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PayeeDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", PayeeDto)
], TransactionDto.prototype, "payee", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", AdditionalDataDto)
], TransactionDto.prototype, "additionalData", void 0);
class TransferRequestDto {
}
exports.TransferRequestDto = TransferRequestDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TransactionDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", TransactionDto)
], TransferRequestDto.prototype, "transaction", void 0);
//# sourceMappingURL=transfer-request.dto.js.map