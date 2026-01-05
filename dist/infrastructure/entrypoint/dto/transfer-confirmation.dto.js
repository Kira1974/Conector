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
exports.TransferConfirmationDto = exports.CredibancoSettlementResultDto = exports.SettlementPropertiesDto = exports.SettlementPayloadDto = exports.SettlementErrorDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SettlementErrorDto {
}
exports.SettlementErrorDto = SettlementErrorDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SettlementErrorDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SettlementErrorDto.prototype, "description", void 0);
class SettlementPayloadDto {
}
exports.SettlementPayloadDto = SettlementPayloadDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SettlementPayloadDto.prototype, "execution_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SettlementPayloadDto.prototype, "end_to_end_id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SettlementPayloadDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SettlementErrorDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], SettlementPayloadDto.prototype, "errors", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SettlementPayloadDto.prototype, "qr_code_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], SettlementPayloadDto.prototype, "time_marks", void 0);
class SettlementPropertiesDto {
}
exports.SettlementPropertiesDto = SettlementPropertiesDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SettlementPropertiesDto.prototype, "event_date", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SettlementPropertiesDto.prototype, "trace_id", void 0);
class CredibancoSettlementResultDto {
}
exports.CredibancoSettlementResultDto = CredibancoSettlementResultDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CredibancoSettlementResultDto.prototype, "event_name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CredibancoSettlementResultDto.prototype, "event_type", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SettlementPayloadDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", SettlementPayloadDto)
], CredibancoSettlementResultDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SettlementPropertiesDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", SettlementPropertiesDto)
], CredibancoSettlementResultDto.prototype, "properties", void 0);
class TransferConfirmationDto {
}
exports.TransferConfirmationDto = TransferConfirmationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransferConfirmationDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransferConfirmationDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransferConfirmationDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CredibancoSettlementResultDto),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", CredibancoSettlementResultDto)
], TransferConfirmationDto.prototype, "payload", void 0);
//# sourceMappingURL=transfer-confirmation.dto.js.map