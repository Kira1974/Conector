"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MountebankModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MountebankModule = void 0;
const common_1 = require("@nestjs/common");
const configuration_module_1 = require("../configuration.module");
const mountebank_service_1 = require("./mountebank.service");
let MountebankModule = MountebankModule_1 = class MountebankModule {
    static forRoot() {
        return {
            module: MountebankModule_1,
            imports: [configuration_module_1.ConfigurationModule],
            providers: [mountebank_service_1.MountebankService],
            exports: [mountebank_service_1.MountebankService]
        };
    }
};
exports.MountebankModule = MountebankModule;
exports.MountebankModule = MountebankModule = MountebankModule_1 = __decorate([
    (0, common_1.Module)({})
], MountebankModule);
//# sourceMappingURL=mountebank.module.js.map