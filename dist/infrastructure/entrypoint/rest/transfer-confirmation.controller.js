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
exports.TransferConfirmationController = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const confirmation_usecase_1 = require("../../../core/usecase/confirmation.usecase");
const transfer_confirmation_dto_1 = require("../dto/transfer-confirmation.dto");
let TransferConfirmationController = class TransferConfirmationController {
    constructor(confirmationUseCase) {
        this.confirmationUseCase = confirmationUseCase;
    }
    handleConfirmation(notification) {
        return this.confirmationUseCase.processConfirmation(notification);
    }
};
exports.TransferConfirmationController = TransferConfirmationController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('transfer').setAction('confirm'),
        tags: ['transfer', 'confirmation', 'webhook']
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transfer_confirmation_dto_1.TransferConfirmationDto]),
    __metadata("design:returntype", Object)
], TransferConfirmationController.prototype, "handleConfirmation", null);
exports.TransferConfirmationController = TransferConfirmationController = __decorate([
    (0, common_1.Controller)('transfer-confirmation'),
    __metadata("design:paramtypes", [confirmation_usecase_1.ConfirmationUseCase])
], TransferConfirmationController);
//# sourceMappingURL=transfer-confirmation.controller.js.map