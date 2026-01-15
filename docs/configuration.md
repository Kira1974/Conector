# Configuration Guide

This document explains how to use the configuration system in the application.

## Overview

The application uses JSON configuration files per environment located in `deployment/{env}/app.json`. A base configuration file (`deployment/base/app.json`) contains common settings that are merged with environment-specific files. Sensitive data (credentials, certificates) is stored in `.env` files.

## Configuration Files

### JSON Configuration Files

- `deployment/base/app.json` - Base configuration (common settings, merged with environment-specific files)
- `deployment/local/app.json` - Local development environment
- `deployment/dev/app.json` - Development environment
- `deployment/qa/app.json` - QA environment
- `deployment/preprod/app.json` - Pre-production environment
- `deployment/prod/app.json` - Production environment

**Configuration Merge:** The system loads `deployment/base/app.json` first, then merges it with the environment-specific file (e.g., `deployment/dev/app.json`). Environment-specific values override base values.

### Environment Variables (.env)

Sensitive data that should NOT be in JSON files:
- `CLIENT_ID_CREDIBANCO`
- `CLIENT_SECRET_CREDIBANCO`
- `MTLS_CLIENT_CERT_CREDIBANCO`
- `MTLS_CLIENT_KEY_CREDIBANCO`

## Using Configuration

All configuration services now use `GenericConfigService` internally, providing a consistent API across the application.

### Option 1: GenericConfigService (Recommended for New Configs)

The easiest way to access any configuration value without creating new service files. All existing services use this internally.

```typescript
import { Injectable } from '@nestjs/common';
import { GenericConfigService } from '@config/generic-config.service';

@Injectable()
export class MyService {
  constructor(private config: GenericConfigService) {}

  someMethod(): void {
    // Get any value from JSON using dot notation (fails if not found)
    const port = this.config.get<number>('app.port');
    const timeout = this.config.get<number>('transfer.timeoutMs');
    const enabled = this.config.get<boolean>('mountebank.enabled');
    
    // Check if value exists before accessing
    if (this.config.has('newFeature.enabled')) {
      const featureEnabled = this.config.get<boolean>('newFeature.enabled');
    }
  }
}
```

**Adding a new configuration:**

1. Add it to the JSON file:
```json
{
  "newFeature": {
    "enabled": true,
    "maxRetries": 3,
    "timeout": 5000
  }
}
```

2. Use it immediately in your code:
```typescript
// All values are required - will fail if not in JSON
const enabled = this.config.get<boolean>('newFeature.enabled');
const maxRetries = this.config.get<number>('newFeature.maxRetries');
const timeout = this.config.get<number>('newFeature.timeout');

// Check if optional value exists before accessing
if (this.config.has('newFeature.optional')) {
  const optionalValue = this.config.get<string>('newFeature.optional');
}
```

### Option 2: Specific Configuration Services

For commonly used configurations, there are dedicated services with typed methods:

#### AppConfigService

```typescript
import { AppConfigService } from '@config/app-config.service';

constructor(private appConfig: AppConfigService) {}

const port = this.appConfig.getPort();
```

#### ExternalServicesConfigService

```typescript
import { ExternalServicesConfigService } from '@config/external-services-config.service';

constructor(private externalServices: ExternalServicesConfigService) {}

const oauthUrl = this.externalServices.getOAuthBaseUrl();
const difeUrl = this.externalServices.getDifeBaseUrl();
const molUrl = this.externalServices.getMolBaseUrl();
const oauthTimeout = this.externalServices.getOAuthTimeout();
const difeTimeout = this.externalServices.getDifeTimeout();
const molTimeout = this.externalServices.getMolTimeout();
const molQueryTimeout = this.externalServices.getMolQueryTimeout();
```

#### TransferConfigService

```typescript
import { TransferConfigService } from '@config/transfer-config.service';

constructor(private transferConfig: TransferConfigService) {}

const timeout = this.transferConfig.getTransferTimeout();
const pollingDelay = this.transferConfig.getWebhookPollingStartDelay();
const pollingInterval = this.transferConfig.getPollingInterval();
const isPollingEnabled = this.transferConfig.isPollingEnabled();
```

#### MountebankConfigService

```typescript
import { MountebankConfigService } from '@config/mountebank-config.service';

constructor(private mountebankConfig: MountebankConfigService) {}

const isEnabled = this.mountebankConfig.isEnabled();
const oauthPort = this.mountebankConfig.getOAuthPort();
const difePort = this.mountebankConfig.getDifePort();
const molPort = this.mountebankConfig.getMolPort();
```

#### MolPayerConfigService

```typescript
import { MolPayerConfigService } from '@config/mol-payer-config.service';

constructor(private molPayerConfig: MolPayerConfigService) {}

const payer = this.molPayerConfig.getPayerConfig();
// Returns: { identificationType, identificationValue, name, paymentMethodType, paymentMethodValue, paymentMethodCurrency }
```

#### LoggingConfigService

```typescript
import { LoggingConfigService } from '@config/logging-config.service';

constructor(private loggingConfig: LoggingConfigService) {}

const isHttpHeadersLogEnabled = this.loggingConfig.isHttpHeadersLogEnabled();
```

#### SecretsConfigService

```typescript
import { SecretsConfigService } from '@config/secrets-config.service';

constructor(private secretsConfig: SecretsConfigService) {}

const clientId = this.secretsConfig.getClientIdCredibanco();
const clientSecret = this.secretsConfig.getClientSecretCredibanco();
const clientCert = this.secretsConfig.getMtlsClientCertCredibanco();
const clientKey = this.secretsConfig.getMtlsClientKeyCredibanco();
```

## Configuration Structure

### JSON Structure

```json
{
  "app": {
    "port": 3000
  },
  "externalServices": {
    "oauth": {
      "baseUrl": "https://oauth.example.com",  // Only when mountebank.enabled=false
      "timeoutMs": 15000,
      "cacheTtlSeconds": 3000
    },
    "dife": {
      "baseUrl": "https://dife.example.com",  // Only when mountebank.enabled=false
      "timeoutMs": 30000
    },
    "mol": {
      "baseUrl": "https://mol.example.com",  // Only when mountebank.enabled=false
      "timeoutMs": 30000,
      "queryTimeoutMs": 10000
    }
  },
  "transfer": {
    "timeoutMs": 50000,
    "webhookPollingStartDelayMs": 30000,
    "pollingIntervalMs": 5000,
    "enablePolling": true
  },
  "mountebank": {
    "enabled": false,
    "oauthPort": 4545,  // Only when enabled=true
    "difePort": 4546,   // Only when enabled=true
    "molPort": 4547     // Only when enabled=true
  },
  "molPayer": {
    "identificationType": "CITIZENSHIP_ID",
    "identificationValue": "1234567890",
    "name": "Test Payer",
    "paymentMethodType": "SAVINGS_ACCOUNT",
    "paymentMethodValue": "000000000",
    "paymentMethodCurrency": "COP"
  },
  "logging": {
    "enableHttpHeadersLog": false,
    "environment": "development",
    "service": "charon",
    "version": "1.0.0",
    "minLevel": "DEBUG",
    "pretty": true,
    "colors": true
  }
}
```

## Mountebank Configuration Rules

### When `mountebank.enabled = true`:
- External service URLs (`externalServices.*.baseUrl`) **MUST NOT** be configured in JSON
- Mountebank ports (`mountebank.oauthPort`, `mountebank.difePort`, `mountebank.molPort`) **MUST** be configured
- URLs are automatically set to `http://localhost:{port}`
- Application will fail to start if URLs are configured

### When `mountebank.enabled = false`:
- External service URLs (`externalServices.*.baseUrl`) **MUST** be configured in JSON
- Mountebank ports are ignored
- Application will fail to start if URLs are missing

## Best Practices

1. **Use GenericConfigService for new configurations**: No need to create new service files
2. **Use specific services for common configurations**: Better type safety and IDE autocomplete
3. **Never put sensitive data in JSON files**: Use `.env` files for credentials and certificates
4. **All configurations are required**: `config.get('path')` will fail if not found
5. **Check optional values with has()**: Use `config.has('path')` before accessing optional configurations
6. **Fail fast**: Missing configurations will cause the application to fail at startup, preventing runtime errors

## Examples

### Adding a New Feature Flag

1. Add to JSON:
```json
{
  "features": {
    "newPaymentMethod": {
      "enabled": true,
      "maxAmount": 1000000
    }
  }
}
```

2. Use in code:
```typescript
constructor(private config: GenericConfigService) {}

if (this.config.get<boolean>('features.newPaymentMethod.enabled', false)) {
  const maxAmount = this.config.get<number>('features.newPaymentMethod.maxAmount');
  // Use the feature
}
```

### Adding a New Service Configuration

1. Add to JSON:
```json
{
  "newService": {
    "baseUrl": "https://api.example.com",
    "timeout": 30000,
    "retries": 3
  }
}
```

2. Use in code:
```typescript
constructor(private config: GenericConfigService) {}

// All required - will fail if not in JSON
const baseUrl = this.config.get<string>('newService.baseUrl');
const timeout = this.config.get<number>('newService.timeout');
const retries = this.config.get<number>('newService.retries');
```

## Migration from Environment Variables

If you have existing code using `process.env`, you can migrate to the configuration system:

**Before:**
```typescript
const timeout = parseInt(process.env.TRANSFER_TIMEOUT_MS || '50000', 10);
```

**After:**
```typescript
// Option 1: GenericConfigService
const timeout = this.config.get<number>('transfer.timeoutMs', 50000);

// Option 2: Specific service
const timeout = this.transferConfig.getTransferTimeout();
```
