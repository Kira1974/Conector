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
const account_query_usecase_1 = require("../../../core/usecase/account-query.usecase");
const util_1 = require("../../../core/util");
const dto_1 = require("../dto");
const api_account_query_docs_decorator_1 = require("./decorators/api-account-query-docs.decorator");
let AccountQueryController = AccountQueryController_1 = class AccountQueryController {
    constructor(accountQueryUseCase, loggerService) {
        this.accountQueryUseCase = accountQueryUseCase;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(AccountQueryController_1.name, themis_1.ThLoggerComponent.CONTROLLER);
    }
    async queryAccount(request) {
        const keyValue = request.account.value;
        this.logger.log('CHARON_REQUEST', {
            accountType: request.account.type,
            key: (0, util_1.obfuscateKey)(keyValue, 3)
        });
        const result = await this.accountQueryUseCase.execute(keyValue);
        const { response, correlationId, difeExecutionId, httpStatus } = result;
        this.logger.log('CHARON_RESPONSE', {
            status: httpStatus,
            correlationId,
            externalTransactionId: difeExecutionId,
            responseCode: response.data?.state || response.code,
            responseBody: response
        });
        if (httpStatus !== common_1.HttpStatus.CREATED) {
            throw new common_1.HttpException(response, httpStatus);
        }
        return response;
    }
};
exports.AccountQueryController = AccountQueryController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, api_account_query_docs_decorator_1.ApiAccountQueryDocs)(),
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('account-query').setAction('post'),
        tags: ['account-query', 'breb', 'dife']
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AccountQueryRequestDto]),
    __metadata("design:returntype", Promise)
], AccountQueryController.prototype, "queryAccount", null);
exports.AccountQueryController = AccountQueryController = AccountQueryController_1 = __decorate([
    (0, swagger_1.ApiTags)('Account Query'),
    (0, common_1.Controller)('account/query'),
    (0, common_1.UseInterceptors)(themis_1.ThHttpRequestTracingInterceptor, themis_1.ThHttpResponseTracingInterceptor),
    __metadata("design:paramtypes", [account_query_usecase_1.AccountQueryUseCase,
        themis_1.ThLoggerService])
], AccountQueryController);
//# sourceMappingURL=account-query.controller.js.map