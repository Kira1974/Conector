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
exports.ThemisLoggerConfigService = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const generic_config_service_1 = require("./generic-config.service");
let ThemisLoggerConfigService = class ThemisLoggerConfigService {
    constructor(config) {
        this.config = config;
    }
    getLoggerConfig() {
        const isPrettyEnabled = this.config.get('logging.pretty');
        const areColorsEnabled = this.config.get('logging.colors');
        const minLevelStr = this.config.get('logging.minLevel');
        const minLevel = this.mapStringToLogLevel(minLevelStr);
        return {
            environment: this.config.get('logging.environment'),
            service: this.config.get('logging.service'),
            version: this.config.get('logging.version'),
            minimumLevel: minLevel,
            format: {
                pretty: isPrettyEnabled,
                colors: areColorsEnabled
            }
        };
    }
    mapStringToLogLevel(level) {
        const levelMap = {
            DEBUG: themis_1.ThLogLevel.DEBUG,
            INFO: themis_1.ThLogLevel.INFO,
            WARN: themis_1.ThLogLevel.WARN,
            ERROR: themis_1.ThLogLevel.ERROR
        };
        const mapped = levelMap[level.toUpperCase()];
        if (!mapped) {
            throw new Error(`Invalid log level: ${level}. Must be one of: DEBUG, INFO, WARN, ERROR`);
        }
        return mapped;
    }
};
exports.ThemisLoggerConfigService = ThemisLoggerConfigService;
exports.ThemisLoggerConfigService = ThemisLoggerConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [generic_config_service_1.GenericConfigService])
], ThemisLoggerConfigService);
//# sourceMappingURL=themis-logger-config.service.js.map