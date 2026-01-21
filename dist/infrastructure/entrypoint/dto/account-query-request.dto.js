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
exports.AccountQueryRequestDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class AccountDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Account type must be a string' }),
    __metadata("design:type", String)
], AccountDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Account value cannot be empty' }),
    (0, class_validator_1.IsString)({ message: 'Account value must be a string' }),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(92),
    __metadata("design:type", String)
], AccountDto.prototype, "value", void 0);
class AccountQueryRequestDto {
}
exports.AccountQueryRequestDto = AccountQueryRequestDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AccountDto),
    (0, class_validator_1.IsNotEmpty)({ message: 'Account cannot be empty' }),
    __metadata("design:type", AccountDto)
], AccountQueryRequestDto.prototype, "account", void 0);
//# sourceMappingURL=account-query-request.dto.js.map