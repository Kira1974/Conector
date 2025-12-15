"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const themis_1 = require("themis");
const core_module_1 = require("../core/core.module");
const provider_module_1 = require("../infrastructure/provider/provider.module");
const entrypoint_module_1 = require("../infrastructure/entrypoint/entrypoint.module");
const configuration_module_1 = require("./configuration.module");
const themis_logger_config_service_1 = require("./themis-logger-config.service");
const mountebank_loader_util_1 = require("./mountebank-loader.util");
const mountebankImports = (0, mountebank_loader_util_1.isMountebankEnabled)() ? [(0, mountebank_loader_util_1.loadMountebankModule)()] : [];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            configuration_module_1.ConfigurationModule,
            themis_1.ThTracingModule.registerLoggerAsync({
                inject: [themis_logger_config_service_1.ThemisLoggerConfigService],
                useFactory: (loggerConfig) => {
                    return loggerConfig.getLoggerConfig();
                }
            }),
            nestjs_prometheus_1.PrometheusModule.register(),
            provider_module_1.ProviderModule,
            core_module_1.CoreModule,
            entrypoint_module_1.EntrypointModule,
            ...mountebankImports
        ]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map