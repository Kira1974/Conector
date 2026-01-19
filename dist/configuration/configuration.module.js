"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationModule = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_config_service_1 = require("./app-config.service");
const external_services_config_service_1 = require("./external-services-config.service");
const transfer_config_service_1 = require("./transfer-config.service");
const mountebank_config_service_1 = require("./mountebank-config.service");
const mol_payer_config_service_1 = require("./mol-payer-config.service");
const logging_config_service_1 = require("./logging-config.service");
const secrets_config_service_1 = require("./secrets-config.service");
const themis_logger_config_service_1 = require("./themis-logger-config.service");
const generic_config_service_1 = require("./generic-config.service");
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (!Object.prototype.hasOwnProperty.call(source, key)) {
            continue;
        }
        const sourceValue = source[key];
        const targetValue = result[key];
        const isSourceObject = sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue);
        const isTargetObject = targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue);
        if (isSourceObject && isTargetObject) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        else {
            result[key] = sourceValue;
        }
    }
    return result;
}
function loadConfiguration() {
    const env = process.env.NODE_ENV || 'dev';
    const baseConfigPath = path.join(process.cwd(), 'deployment', 'base', 'app.json');
    const envConfigPath = path.join(process.cwd(), 'deployment', env, 'app.json');
    let baseConfig = {};
    if (fs.existsSync(baseConfigPath)) {
        const baseConfigContent = fs.readFileSync(baseConfigPath, 'utf-8');
        baseConfig = JSON.parse(baseConfigContent);
    }
    if (!fs.existsSync(envConfigPath)) {
        throw new Error(`Configuration file not found: ${envConfigPath}`);
    }
    const envConfigContent = fs.readFileSync(envConfigPath, 'utf-8');
    const envConfig = JSON.parse(envConfigContent);
    const mergedConfig = deepMerge(baseConfig, envConfig);
    return {
        ...mergedConfig,
        secrets: {
            clientIdCredibanco: process.env.CLIENT_ID_CREDIBANCO,
            clientSecretCredibanco: process.env.CLIENT_SECRET_CREDIBANCO,
            mtlsClientCertCredibanco: process.env.MTLS_CLIENT_CERT_CREDIBANCO,
            mtlsClientKeyCredibanco: process.env.MTLS_CLIENT_KEY_CREDIBANCO
        }
    };
}
let ConfigurationModule = class ConfigurationModule {
};
exports.ConfigurationModule = ConfigurationModule;
exports.ConfigurationModule = ConfigurationModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [loadConfiguration],
                envFilePath: ['.env.local', '.env']
            })
        ],
        providers: [
            app_config_service_1.AppConfigService,
            external_services_config_service_1.ExternalServicesConfigService,
            transfer_config_service_1.TransferConfigService,
            mountebank_config_service_1.MountebankConfigService,
            mol_payer_config_service_1.MolPayerConfigService,
            logging_config_service_1.LoggingConfigService,
            secrets_config_service_1.SecretsConfigService,
            themis_logger_config_service_1.ThemisLoggerConfigService,
            generic_config_service_1.GenericConfigService
        ],
        exports: [
            app_config_service_1.AppConfigService,
            external_services_config_service_1.ExternalServicesConfigService,
            transfer_config_service_1.TransferConfigService,
            mountebank_config_service_1.MountebankConfigService,
            mol_payer_config_service_1.MolPayerConfigService,
            logging_config_service_1.LoggingConfigService,
            secrets_config_service_1.SecretsConfigService,
            themis_logger_config_service_1.ThemisLoggerConfigService,
            generic_config_service_1.GenericConfigService
        ]
    })
], ConfigurationModule);
//# sourceMappingURL=configuration.module.js.map