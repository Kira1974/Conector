import { NestFactory } from '@nestjs/core';
import { Logger, RequestMethod } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AppConfigService } from './app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get(AppConfigService);
  const port = appConfig.getPort();

  app.use(helmet());

  app.setGlobalPrefix('api/v1', {
    exclude: [
      {
        path: 'health',
        method: RequestMethod.GET
      },
      {
        path: 'metrics',
        method: RequestMethod.GET
      }
    ]
  });

  const config = new DocumentBuilder()
    .setTitle('Charon Adapter')
    .setDescription('Credibanco Adapter')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`REST API running on: http://localhost:${port}/api/v1`);
  logger.log(`Healthcheck available at: http://localhost:${port}/health`);
  logger.log(`Prometheus metrics available at: http://localhost:${port}/metrics`);
  logger.log(`Swagger documentation: http://localhost:${port}/api-docs`);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
