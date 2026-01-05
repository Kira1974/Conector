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
exports.MolPayerConfigService = void 0;
const common_1 = require("@nestjs/common");
const generic_config_service_1 = require("./generic-config.service");
let MolPayerConfigService = class MolPayerConfigService {
    constructor(config) {
        this.config = config;
    }
    getPayerConfiguration() {
        const identificationType = this.config.get('molPayer.identificationType');
        const identificationValue = this.config.get('molPayer.identificationValue');
        const name = this.config.get('molPayer.name');
        const paymentMethodType = this.config.get('molPayer.paymentMethodType');
        const paymentMethodValue = this.config.get('molPayer.paymentMethodValue');
        const paymentMethodCurrency = this.config.get('molPayer.paymentMethodCurrency');
        if (!identificationType ||
            !identificationValue ||
            !name ||
            !paymentMethodType ||
            !paymentMethodValue ||
            !paymentMethodCurrency) {
            throw new Error('MOL payer configuration is not fully configured');
        }
        return {
            identificationType,
            identificationValue,
            name,
            paymentMethodType,
            paymentMethodValue,
            paymentMethodCurrency
        };
    }
};
exports.MolPayerConfigService = MolPayerConfigService;
exports.MolPayerConfigService = MolPayerConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [generic_config_service_1.GenericConfigService])
], MolPayerConfigService);
//# sourceMappingURL=mol-payer-config.service.js.map