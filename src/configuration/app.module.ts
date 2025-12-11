import { DynamicModule, Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ThTracingModule } from 'themis';

import { CoreModule } from '../core/core.module';
import { ProviderModule } from '../infrastructure/provider/provider.module';
import { EntrypointModule } from '../infrastructure/entrypoint/entrypoint.module';

import { ConfigurationModule } from './configuration.module';
import { ThemisLoggerConfigService } from './themis-logger-config.service';
import { isMountebankEnabled, loadMountebankModule } from './mountebank-loader.util';

const mountebankImports: DynamicModule[] = isMountebankEnabled() ? [loadMountebankModule()] : [];

@Module({
  imports: [
    ConfigurationModule,
    ThTracingModule.registerLoggerAsync({
      inject: [ThemisLoggerConfigService],
      useFactory: (loggerConfig: ThemisLoggerConfigService) => {
        return loggerConfig.getLoggerConfig();
      }
    }) as unknown as typeof ThTracingModule,
    PrometheusModule.register(),
    // Hexagonal architecture
    ProviderModule,
    CoreModule,
    EntrypointModule,
    // Mountebank module (only loaded when enabled)
    ...mountebankImports
  ]
})
export class AppModule {}
