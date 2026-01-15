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
exports.KeyResolutionResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class KeyResolutionResponseDto {
}
exports.KeyResolutionResponseDto = KeyResolutionResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document number', example: '1234567890' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document type', example: 'CC' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Obfuscated name', example: 'Mig*** Her***' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "personName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Person type', example: 'N' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "personType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Financial entity NIT', example: '900123456' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "financialEntityNit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account type', example: 'CAHO' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "accountType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Obfuscated account number', example: '***334455' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "accountNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The queried key', example: '@COLOMBIA' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "key", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Key type', example: 'O' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "keyType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Response code', example: 'SUCCESS', enum: ['SUCCESS', 'ERROR', 'VALIDATION_FAILED'] }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "responseCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Custom error message', required: false }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Network error code', required: false, example: 'DIFE-0001' }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "networkCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Network error message',
        required: false,
        example: 'DIFE: The key does not exist or is canceled'
    }),
    __metadata("design:type", String)
], KeyResolutionResponseDto.prototype, "networkMessage", void 0);
//# sourceMappingURL=key-resolution.response.dto.js.map