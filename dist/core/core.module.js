"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreModule = void 0;
const common_1 = require("@nestjs/common");
const provider_module_1 = require("../infrastructure/provider/provider.module");
const confirmation_usecase_1 = require("./usecase/confirmation.usecase");
const transfer_usecase_1 = require("./usecase/transfer.usecase");
const pending_transfer_service_1 = require("./usecase/pending-transfer.service");
const account_query_usecase_1 = require("./usecase/account-query.usecase");
let CoreModule = class CoreModule {
};
exports.CoreModule = CoreModule;
exports.CoreModule = CoreModule = __decorate([
    (0, common_1.Module)({
        imports: [provider_module_1.ProviderModule],
        providers: [confirmation_usecase_1.ConfirmationUseCase, transfer_usecase_1.TransferUseCase, pending_transfer_service_1.PendingTransferService, account_query_usecase_1.AccountQueryUseCase],
        exports: [confirmation_usecase_1.ConfirmationUseCase, transfer_usecase_1.TransferUseCase, pending_transfer_service_1.PendingTransferService, account_query_usecase_1.AccountQueryUseCase]
    })
], CoreModule);
//# sourceMappingURL=core.module.js.map