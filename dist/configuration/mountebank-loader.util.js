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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMountebankModule = exports.isMountebankEnabled = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function isMountebankEnabled() {
    try {
        const env = process.env.ENV;
        if (!env) {
            throw new Error('Environment variable ENV is required but not set');
        }
        const configPath = path.join(process.cwd(), 'deployment', env, 'app.json');
        if (!fs.existsSync(configPath)) {
            return false;
        }
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        return config.mountebank?.enabled === true;
    }
    catch {
        return false;
    }
}
exports.isMountebankEnabled = isMountebankEnabled;
function loadMountebankModule() {
    const mountebankModule = require('./setup/mountebank.module');
    return mountebankModule.MountebankModule.forRoot();
}
exports.loadMountebankModule = loadMountebankModule;
//# sourceMappingURL=mountebank-loader.util.js.map