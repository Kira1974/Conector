"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderModule = void 0;
const common_1 = require("@nestjs/common");
const provider_1 = require("../../core/provider");
const resilience_config_service_1 = require("./resilience-config.service");
const http_client_service_1 = require("./http-clients/http-client.service");
const auth_service_1 = require("./http-clients/auth.service");
const http_clients_1 = require("./http-clients");
let ProviderModule = class ProviderModule {
};
exports.ProviderModule = ProviderModule;
exports.ProviderModule = ProviderModule = __decorate([
    (0, common_1.Module)({
        providers: [
            resilience_config_service_1.ResilienceConfigService,
            http_client_service_1.HttpClientService,
            auth_service_1.AuthService,
            {
                provide: provider_1.IDifeProvider,
                useClass: http_clients_1.DifeProvider
            },
            {
                provide: provider_1.IMolPaymentProvider,
                useClass: http_clients_1.MolPaymentProvider
            }
        ],
        exports: [resilience_config_service_1.ResilienceConfigService, http_client_service_1.HttpClientService, auth_service_1.AuthService, provider_1.IDifeProvider, provider_1.IMolPaymentProvider]
    })
], ProviderModule);
//# sourceMappingURL=provider.module.js.map