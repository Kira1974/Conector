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
var TransferController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferController = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const usecase_1 = require("../../../core/usecase");
const dto_1 = require("../dto");
const http_status_mapper_1 = require("./util/http-status.mapper");
let TransferController = TransferController_1 = class TransferController {
    constructor(transferUseCase, loggerService) {
        this.transferUseCase = transferUseCase;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(TransferController_1.name, themis_1.ThLoggerComponent.CONTROLLER);
    }
    async transfer(request, res) {
        const eventId = request.transaction.id;
        const traceId = request.transaction.id;
        const correlationId = request.transaction.id;
        this.logger.log('CHARON Request', {
            method: 'POST',
            transactionId: request.transaction.id,
            eventId,
            traceId,
            correlationId,
            amount: request.transaction.amount.total,
            currency: request.transaction.amount.currency,
            requestBody: JSON.stringify(request, null, 2)
        });
        const responseDto = await this.transferUseCase.executeTransfer(request);
        const httpStatus = http_status_mapper_1.HttpStatusMapper.mapResponseCodeToHttpStatus(responseDto.responseCode);
        const endToEndId = responseDto.additionalData?.END_TO_END;
        const finalCorrelationId = endToEndId || responseDto.transactionId;
        const responseData = {
            state: responseDto.responseCode
        };
        if (responseDto.transactionId) {
            responseData.transactionId = responseDto.transactionId;
        }
        if (responseDto.externalTransactionId) {
            responseData.externalTransactionId = responseDto.externalTransactionId;
        }
        if (responseDto.networkCode) {
            responseData.networkCode = responseDto.networkCode;
        }
        if (responseDto.networkMessage) {
            responseData.networkMessage = responseDto.networkMessage;
        }
        if (responseDto.additionalData && Object.keys(responseDto.additionalData).length > 0) {
            responseData.additionalData = responseDto.additionalData;
        }
        const standardResponse = {
            code: httpStatus,
            message: responseDto.message,
            data: responseData
        };
        this.logger.log('CHARON Response', {
            status: httpStatus,
            transactionId: responseDto.transactionId,
            eventId,
            traceId,
            correlationId: finalCorrelationId,
            endToEndId,
            state: responseDto.responseCode,
            responseBody: JSON.stringify(standardResponse, null, 2)
        });
        return res.status(httpStatus).json(standardResponse);
    }
};
exports.TransferController = TransferController;
__decorate([
    (0, common_1.Post)(),
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('transfer').setAction('process'),
        tags: ['transfer', 'payment']
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.TransferRequestDto, Object]),
    __metadata("design:returntype", Promise)
], TransferController.prototype, "transfer", null);
exports.TransferController = TransferController = TransferController_1 = __decorate([
    (0, common_1.Controller)('transfer'),
    __metadata("design:paramtypes", [usecase_1.TransferUseCase,
        themis_1.ThLoggerService])
], TransferController);
//# sourceMappingURL=transfer.controller.js.map