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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyResolutionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const usecase_1 = require("../../../core/usecase");
const dto_1 = require("../dto");
let KeyResolutionController = class KeyResolutionController {
    constructor(keyResolutionUseCase) {
        this.keyResolutionUseCase = keyResolutionUseCase;
    }
    async getKeyInformation(key) {
        return this.keyResolutionUseCase.execute(key);
    }
};
exports.KeyResolutionController = KeyResolutionController;
__decorate([
    (0, common_1.Get)(':key'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get key resolution',
        description: 'Retrieves account and holder information associated with a payment key.'
    }),
    (0, swagger_1.ApiParam)({
        name: 'key',
        description: 'Formats: alphanumeric (@XXXXX), mobile number (30XXXXXXXX), email address, commerce code (00XXXXXXXX), or identification number (123456789)',
        example: '@COLOMBIA',
        type: String
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Key information retrieved successfully',
        type: dto_1.KeyResolutionResponseDto,
        examples: {
            success: {
                summary: 'Successful key resolution',
                value: {
                    documentNumber: '123143455',
                    documentType: 'CC',
                    personName: 'Jua*** Car*** Pér*** Góm***',
                    personType: 'N',
                    financialEntityNit: '12345678',
                    accountType: 'CAHO',
                    accountNumber: '*******890123',
                    key: '3125656294',
                    keyType: 'M',
                    responseCode: 'SUCCESS'
                }
            },
            error: {
                summary: 'Failed key resolution',
                value: {
                    key: 'invalid_key_5005',
                    keyType: 'NRIC',
                    responseCode: 'ERROR',
                    message: 'custom message.',
                    networkCode: 'DIFE-5005',
                    networkMessage: 'The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure.'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid key format'
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error'
    }),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KeyResolutionController.prototype, "getKeyInformation", null);
exports.KeyResolutionController = KeyResolutionController = __decorate([
    (0, swagger_1.ApiTags)('Key Resolution'),
    (0, common_1.Controller)('keys'),
    __metadata("design:paramtypes", [usecase_1.KeyResolutionUseCase])
], KeyResolutionController);
//# sourceMappingURL=key-resolution.controller.js.map