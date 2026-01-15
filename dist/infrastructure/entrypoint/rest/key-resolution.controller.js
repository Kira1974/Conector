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
var KeyResolutionController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyResolutionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const themis_1 = require("themis");
const usecase_1 = require("../../../core/usecase");
const util_1 = require("../../../core/util");
const key_resolution_params_dto_1 = require("../dto/key-resolution-params.dto");
const api_key_resolution_docs_decorator_1 = require("./decorators/api-key-resolution-docs.decorator");
const key_resolution_http_status_mapper_1 = require("./mappers/key-resolution-http-status.mapper");
let KeyResolutionController = KeyResolutionController_1 = class KeyResolutionController {
    constructor(keyResolutionUseCase, loggerService) {
        this.keyResolutionUseCase = keyResolutionUseCase;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(KeyResolutionController_1.name, themis_1.ThLoggerComponent.CONTROLLER);
    }
    async getKeyInformation(params) {
        const { key } = params;
        this.logger.log('CHARON_REQUEST', {
            keyType: (0, util_1.calculateKeyType)(key),
            key: (0, util_1.obfuscateKey)(key, 3)
        });
        const result = await this.keyResolutionUseCase.execute(key);
        const { response, correlationId, difeExecutionId } = result;
        const httpStatus = response.responseCode === 'SUCCESS'
            ? common_1.HttpStatus.OK
            : key_resolution_http_status_mapper_1.KeyResolutionHttpStatusMapper.mapNetworkCodeToHttpStatus(response.networkCode);
        this.logger.log('CHARON_RESPONSE', {
            status: httpStatus,
            correlationId,
            externalTransactionId: difeExecutionId,
            responseBody: response
        });
        if (response.responseCode !== 'SUCCESS') {
            throw new common_1.HttpException(response, httpStatus);
        }
        return response;
    }
};
exports.KeyResolutionController = KeyResolutionController;
__decorate([
    (0, common_1.Get)(':key'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, api_key_resolution_docs_decorator_1.ApiKeyResolutionDocs)(),
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('key-resolution').setAction('get'),
        tags: ['key-resolution', 'dife']
    }),
    __param(0, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [key_resolution_params_dto_1.KeyResolutionParamsDto]),
    __metadata("design:returntype", Promise)
], KeyResolutionController.prototype, "getKeyInformation", null);
exports.KeyResolutionController = KeyResolutionController = KeyResolutionController_1 = __decorate([
    (0, swagger_1.ApiTags)('Key Resolution'),
    (0, common_1.Controller)('keys'),
    (0, common_1.UseInterceptors)(themis_1.ThHttpRequestTracingInterceptor, themis_1.ThHttpResponseTracingInterceptor),
    __metadata("design:paramtypes", [usecase_1.KeyResolutionUseCase,
        themis_1.ThLoggerService])
], KeyResolutionController);
//# sourceMappingURL=key-resolution.controller.js.map