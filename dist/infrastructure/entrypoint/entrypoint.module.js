"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntrypointModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const core_module_1 = require("../../core/core.module");
const transfer_controller_1 = require("./rest/transfer.controller");
const health_controller_1 = require("./rest/health.controller");
const transfer_confirmation_controller_1 = require("./rest/transfer-confirmation.controller");
const global_exception_filter_1 = require("./rest/interceptors/global-exception.filter");
const global_validation_pipe_1 = require("./rest/interceptors/global-validation.pipe");
const key_resolution_controller_1 = require("./rest/key-resolution.controller");
let EntrypointModule = class EntrypointModule {
};
exports.EntrypointModule = EntrypointModule;
exports.EntrypointModule = EntrypointModule = __decorate([
    (0, common_1.Module)({
        imports: [core_module_1.CoreModule],
        controllers: [transfer_controller_1.TransferController, transfer_confirmation_controller_1.TransferConfirmationController, health_controller_1.HealthController, key_resolution_controller_1.KeyResolutionController],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter
            },
            {
                provide: core_1.APP_PIPE,
                useClass: global_validation_pipe_1.GlobalValidationPipe
            }
        ]
    })
], EntrypointModule);
//# sourceMappingURL=entrypoint.module.js.map