"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const app_config_service_1 = require("./app-config.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const appConfig = app.get(app_config_service_1.AppConfigService);
    const port = appConfig.getPort();
    app.use((0, helmet_1.default)());
    app.setGlobalPrefix('api/v1', {
        exclude: [
            {
                path: 'health',
                method: common_1.RequestMethod.GET
            },
            {
                path: 'metrics',
                method: common_1.RequestMethod.GET
            }
        ]
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Charon Adapter')
        .setDescription('Credibanco Connector')
        .setVersion('1.0')
        .addTag('Key Resolution', 'Endpoint to resolve a payment key')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    await app.listen(port);
    const logger = new common_1.Logger('Bootstrap');
    logger.log(`REST API running on: http://localhost:${port}/api/v1`);
    logger.log(`Healthcheck available at: http://localhost:${port}/health`);
    logger.log(`Prometheus metrics available at: http://localhost:${port}/metrics`);
    logger.log(`Swagger documentation: http://localhost:${port}/api-docs`);
}
bootstrap().catch((error) => {
    console.error('Error starting application:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map