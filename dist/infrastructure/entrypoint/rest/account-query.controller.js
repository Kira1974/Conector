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
var AccountQueryController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountQueryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const themis_1 = require("themis");
const usecase_1 = require("../../../core/usecase");
const util_1 = require("../../../core/util");
const dto_1 = require("../dto");
const api_account_query_docs_decorator_1 = require("./decorators/api-account-query-docs.decorator");
let AccountQueryController = AccountQueryController_1 = class AccountQueryController {
    constructor(accountQueryUseCase, loggerService) {
        this.accountQueryUseCase = accountQueryUseCase;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(AccountQueryController_1.name, themis_1.ThLoggerComponent.CONTROLLER);
    }
    async queryAccount(request, res) {
        const { account } = request;
        this.logger.log('CHARON_REQUEST', {
            accountType: account.type,
            keyType: (0, util_1.calculateKeyType)(account.value),
            key: (0, util_1.obfuscateKey)(account.value, 3)
        });
        const result = await this.accountQueryUseCase.execute(account.value);
        const { response } = result;
        this.logger.log('CHARON_RESPONSE', {
            status: response.code,
            externalTransactionId: response.data?.externalTransactionId,
            responseBody: response
        });
        return res.status(response.code).json(response);
    }
};
exports.AccountQueryController = AccountQueryController;
__decorate([
    (0, common_1.Post)('query'),
    (0, api_account_query_docs_decorator_1.ApiAccountQueryDocs)(),
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('account-query').setAction('post'),
        tags: ['account-query', 'dife', 'breb']
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AccountQueryRequestDto, Object]),
    __metadata("design:returntype", Promise)
], AccountQueryController.prototype, "queryAccount", null);
exports.AccountQueryController = AccountQueryController = AccountQueryController_1 = __decorate([
    (0, swagger_1.ApiTags)('Account Query'),
    (0, common_1.Controller)('account'),
    (0, common_1.UseInterceptors)(themis_1.ThHttpRequestTracingInterceptor, themis_1.ThHttpResponseTracingInterceptor),
    __metadata("design:paramtypes", [usecase_1.AccountQueryUseCase,
        themis_1.ThLoggerService])
], AccountQueryController);
//# sourceMappingURL=account-query.controller.js.map