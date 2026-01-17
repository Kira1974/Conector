import * as fs from 'fs';
import * as path from 'path';

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigService } from './app-config.service';
import { ExternalServicesConfigService } from './external-services-config.service';
import { TransferConfigService } from './transfer-config.service';
import { MountebankConfigService } from './mountebank-config.service';
import { MolPayerConfigService } from './mol-payer-config.service';
import { LoggingConfigService } from './logging-config.service';
import { SecretsConfigService } from './secrets-config.service';
import { ThemisLoggerConfigService } from './themis-logger-config.service';
import { GenericConfigService } from './generic-config.service';

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
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
      result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else {
      result[key] = sourceValue;
    }
  }
  return result;
}

function loadConfiguration(): Record<string, unknown> {
  const env = process.env.ENV;
  if (!env) {
    throw new Error('Environment variable ENV is required but not set');
  }
  const baseConfigPath = path.join(process.cwd(), 'deployment', 'base', 'app.json');
  const envConfigPath = path.join(process.cwd(), 'deployment', env, 'app.json');

  let baseConfig: Record<string, unknown> = {};
  if (fs.existsSync(baseConfigPath)) {
    const baseConfigContent = fs.readFileSync(baseConfigPath, 'utf-8');
    baseConfig = JSON.parse(baseConfigContent) as Record<string, unknown>;
  }

  if (!fs.existsSync(envConfigPath)) {
    throw new Error(`Configuration file not found: ${envConfigPath}`);
  }

  const envConfigContent = fs.readFileSync(envConfigPath, 'utf-8');
  const envConfig = JSON.parse(envConfigContent) as Record<string, unknown>;

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

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfiguration],
      envFilePath: ['.env.local', '.env']
    })
  ],
  providers: [
    AppConfigService,
    ExternalServicesConfigService,
    TransferConfigService,
    MountebankConfigService,
    MolPayerConfigService,
    LoggingConfigService,
    SecretsConfigService,
    ThemisLoggerConfigService,
    GenericConfigService
  ] as const,
  exports: [
    AppConfigService,
    ExternalServicesConfigService,
    TransferConfigService,
    MountebankConfigService,
    MolPayerConfigService,
    LoggingConfigService,
    SecretsConfigService,
    ThemisLoggerConfigService,
    GenericConfigService
  ] as const
})
export class ConfigurationModule {}
