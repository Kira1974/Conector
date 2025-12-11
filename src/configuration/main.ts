import { NestFactory } from '@nestjs/core';
import { Logger, RequestMethod } from '@nestjs/common';
import helmet from 'helmet';

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

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`REST API running on: http://localhost:${port}/api/v1`);
  logger.log(`Healthcheck available at: http://localhost:${port}/health`);
  logger.log(`Prometheus metrics available at: http://localhost:${port}/metrics`);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
