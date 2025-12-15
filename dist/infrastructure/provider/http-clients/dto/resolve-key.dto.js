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
exports.ResolveKeyRequestDto = void 0;
const class_validator_1 = require("class-validator");
class ResolveKeyRequestDto {
}
exports.ResolveKeyRequestDto = ResolveKeyRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Correlation ID is required in metadata' }),
    (0, class_validator_1.Length)(1, 50, { message: 'Correlation ID must be between 1 and 50 characters' }),
    __metadata("design:type", String)
], ResolveKeyRequestDto.prototype, "correlation_id", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ResolveKeyRequestDto.prototype, "key", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ResolveKeyRequestDto.prototype, "time_marks", void 0);
//# sourceMappingURL=resolve-key.dto.js.map