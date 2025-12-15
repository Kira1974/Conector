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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalServicesConfigService = void 0;
const common_1 = require("@nestjs/common");
const generic_config_service_1 = require("./generic-config.service");
const mountebank_config_service_1 = require("./mountebank-config.service");
let ExternalServicesConfigService = class ExternalServicesConfigService {
    constructor(config, mountebankConfig) {
        this.config = config;
        this.mountebankConfig = mountebankConfig;
    }
    isMountebankEnabled() {
        try {
            return this.mountebankConfig.isEnabled();
        }
        catch {
            return false;
        }
    }
    getOAuthBaseUrl() {
        if (this.isMountebankEnabled()) {
            const port = this.mountebankConfig.getOAuthPort();
            return `http://localhost:${port}`;
        }
        return this.config.get('externalServices.oauth.baseUrl');
    }
    getOAuthTimeout() {
        return this.config.get('externalServices.oauth.timeoutMs');
    }
    getOAuthCacheTtl() {
        return this.config.get('externalServices.oauth.cacheTtlSeconds');
    }
    getDifeBaseUrl() {
        if (this.isMountebankEnabled()) {
            const port = this.mountebankConfig.getDifePort();
            return `http://localhost:${port}`;
        }
        return this.config.get('externalServices.dife.baseUrl');
    }
    getDifeTimeout() {
        return this.config.get('externalServices.dife.timeoutMs');
    }
    getMolBaseUrl() {
        if (this.isMountebankEnabled()) {
            const port = this.mountebankConfig.getMolPort();
            return `http://localhost:${port}`;
        }
        return this.config.get('externalServices.mol.baseUrl');
    }
    getMolTimeout() {
        return this.config.get('externalServices.mol.timeoutMs');
    }
    getMolQueryTimeout() {
        return this.config.get('externalServices.mol.queryTimeoutMs');
    }
};
exports.ExternalServicesConfigService = ExternalServicesConfigService;
exports.ExternalServicesConfigService = ExternalServicesConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [generic_config_service_1.GenericConfigService,
        mountebank_config_service_1.MountebankConfigService])
], ExternalServicesConfigService);
//# sourceMappingURL=external-services-config.service.js.map