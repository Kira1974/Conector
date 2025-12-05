import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ThLogLevel, ThTracingModule } from 'themis';

import { CoreModule } from '../core/core.module';
import { ProviderModule } from '../infrastructure/provider/provider.module';
import { EntrypointModule } from '../infrastructure/entrypoint/entrypoint.module';

/**
 * App Module - Main application module
 * Organization based on hexagonal architecture:
 * - Configuration: Global configuration
 * - Core: Business logic (use cases)
 * - Provider: Output adapters (HTTP clients, repositories)
 * - Entrypoint: Input adapters (REST/gRPC controllers)
 */
@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({ isGlobal: true }),
    PrometheusModule.register(),
    ThTracingModule.registerLoggerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isPrettyEnabled: boolean = config.get<string>('LOGGER_LOGS_PRETTY') === 'true';
        const areColorsEnabled: boolean = config.get<string>('LOGGER_LOGS_COLORS') === 'true';
        return {
          environment: config.get<string>('LOGGER_ENV'),
          service: config.get<string>('LOGGER_SERVICE'),
          version: config.get<string>('LOGGER_VERSION'),
          minimumLevel: config.get<ThLogLevel>('LOGGER_MIN_LEVEL'),
          format: {
            pretty: isPrettyEnabled,
            colors: areColorsEnabled
          }
        };
      }
    }),
    // Hexagonal architecture
    ProviderModule,
    CoreModule,
    EntrypointModule
  ]
})
export class AppModule {}
