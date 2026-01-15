# Mountebank - Mocks for Development and Testing

This document explains how to use Mountebank to mock external services (OAuth, DIFE, and MOL) in development and testing.

## What is Mountebank?

Mountebank is a test doubles tool that allows creating mocks of HTTP/HTTPS services. In this project, we use `@moka1177/mountebank-manager` version 0.2.1 to manage Mountebank instances.

## Development Usage

### Environment Configuration

This project uses `@nestjs/config` with JSON files per environment. Configurations are located in:

```
deployment/
├── dev/app.json      # Development
├── qa/app.json       # QA
├── preprod/app.json  # Pre-production
└── prod/app.json     # Production
```

### Enable Mountebank

To enable Mountebank, edit the corresponding environment JSON file (e.g., `deployment/dev/app.json`):

```json
{
  "mountebank": {
    "enabled": true,
    "oauthPort": 4545,
    "difePort": 4546,
    "molPort": 4547
  }
}
```

**That's it!** You don't need to configure external service URLs because they are automatically configured when Mountebank is enabled.

### Automatic Behavior

When `mountebank.enabled: true` in the JSON, the application:

1. ✅ Automatically starts Mountebank on startup
2. ✅ Configures all imposters (OAuth, DIFE, MOL)
3. ✅ Automatically configures URLs to point to mocks:
   - OAuth: `http://localhost:{oauthPort}`
   - DIFE: `http://localhost:{difePort}`
   - MOL: `http://localhost:{molPort}`
4. ✅ Automatically stops when the application closes

### Default Ports

- **OAuth**: `4545`
- **DIFE**: `4546`
- **MOL**: `4547`

You can customize ports in the JSON:

```json
{
  "mountebank": {
    "enabled": true,
    "oauthPort": 5555,
    "difePort": 5556,
    "molPort": 5557
  }
}
```

### Sensitive Credentials (Environment Variables)

Sensitive credentials remain as environment variables for security. Configure them in `.env`:

```env
CLIENT_ID_CREDIBANCO=test-client-id
CLIENT_SECRET_CREDIBANCO=test-client-secret
MTLS_CLIENT_CERT_CREDIBANCO=test-cert
MTLS_CLIENT_KEY_CREDIBANCO=test-key
```

**Note**: Credentials should NOT be in JSON files, only in environment variables.

### Disable Mountebank

To use real services, change `enabled` to `false` in the JSON:

```json
{
  "mountebank": {
    "enabled": false
  }
}
```

Or simply omit the `mountebank` section from the JSON.

## E2E Testing Usage

### Structure

```
test/e2e/
├── mountebank-helper.ts         # Helper to manage Mountebank
└── transfer.e2e.spec.ts        # E2E transfer tests
```

### Test Configuration

Tests automatically configure Mountebank:

```typescript
import { MountebankHelper, MountebankConfig } from './mountebank-helper';

const mountebankConfig: MountebankConfig = {
  oauthPort: 4545,
  difePort: 4546,
  molPort: 4547
};

const mountebankHelper = new MountebankHelper(mountebankConfig);

beforeAll(async () => {
  await mountebankHelper.start();
  // Configure environment variables...
});

afterAll(async () => {
  await mountebankHelper.stop();
});

beforeEach(async () => {
  await mountebankHelper.clearImposters();
});
```

### Configure Imposters

#### OAuth

```typescript
await mountebankHelper.setupOAuthImposter('success');
await mountebankHelper.setupOAuthImposter('invalid_credentials');
await mountebankHelper.setupOAuthImposter('server_error');
```

#### DIFE

```typescript
await mountebankHelper.setupDifeImposter('success');
await mountebankHelper.setupDifeImposter('invalid_key');
await mountebankHelper.setupDifeImposter('invalid_key_5005');
await mountebankHelper.setupDifeImposter('key_not_found');
await mountebankHelper.setupDifeImposter('key_suspended');
await mountebankHelper.setupDifeImposter('server_error');
```

#### MOL Payment

```typescript
await mountebankHelper.setupMolPaymentImposter('success');
await mountebankHelper.setupMolPaymentImposter('processing');
await mountebankHelper.setupMolPaymentImposter('validation_error');
await mountebankHelper.setupMolPaymentImposter('rejected');
await mountebankHelper.setupMolPaymentImposter('server_error');
await mountebankHelper.setupMolPaymentImposter('timeout_4019');
await mountebankHelper.setupMolPaymentImposter('mol_5005');
await mountebankHelper.setupMolPaymentImposter('mol_4003');
await mountebankHelper.setupMolPaymentImposter('mol_4006');
await mountebankHelper.setupMolPaymentImposter('mol_4007');
await mountebankHelper.setupMolPaymentImposter('mol_4008');
await mountebankHelper.setupMolPaymentImposter('mol_4009');
await mountebankHelper.setupMolPaymentImposter('mol_4010');
await mountebankHelper.setupMolPaymentImposter('mol_4011');
await mountebankHelper.setupMolPaymentImposter('mol_4012');
await mountebankHelper.setupMolPaymentImposter('mol_4013');
await mountebankHelper.setupMolPaymentImposter('mol_4014');
```

#### MOL Query

```typescript
await mountebankHelper.setupMolQueryImposter('success', 'end-to-end-id');
await mountebankHelper.setupMolQueryImposter('not_found');
await mountebankHelper.setupMolQueryImposter('server_error');
```

#### MOL Combined

To have payment and query on the same port:

```typescript
await mountebankHelper.setupMolCombinedImposter(
  'success',      // Payment scenario
  'success',      // Query scenario
  'end-to-end-id' // Optional
);
```

## Available Scenarios

### OAuth

| Scenario | HTTP Code | Description |
|----------|-----------|-------------|
| `success` | 200 | Successful authentication |
| `invalid_credentials` | 401 | Invalid credentials |
| `server_error` | 500 | Server error |

### DIFE

| Scenario | HTTP Code | Error Code | Description |
|----------|-----------|------------|-------------|
| `success` | 200 | - | Successful resolution |
| `@TIMEOUT` | 200 | - | Key resolution for timeout scenario (returns specific execution_id) |
| `invalid_key` | 200 | DIFE-4000 | Invalid key format |
| `invalid_key_5005` | 200 | DIFE-5005 | Invalid key format (email validation) |
| `key_not_found` | 200 | DIFE-0004 | Key does not exist or is canceled |
| `key_suspended` | 200 | DIFE-0005 | Key suspended by client |
| `key_suspended_participant` | 200 | DIFE-0006 | Key suspended by participant |
| `dife_timeout` | 200 | DIFE-5000 | Timeout error |
| `dife_0001` | 200 | DIFE-0001 | Key already registered with same financial institution, different account |
| `dife_0002` | 200 | DIFE-0002 | Key already registered with same account |
| `dife_0003` | 200 | DIFE-0003 | Key already registered with another financial institution |
| `dife_0007` | 200 | DIFE-0007 | Not enough privileges to perform operation |
| `dife_0008` | 200 | DIFE-0008 | Unexpected error in DICE API |
| `dife_5001` | 200 | DIFE-5001 | Another request already processing this payload (duplication) |
| `dife_5003` | 200 | DIFE-5003 | Participant does not exist |
| `dife_9999` | 200 | DIFE-9999 | Unexpected error occurred |
| `server_error` | 500 | - | Server error |

**Note:** All DIFE error codes are mapped to appropriate `TransferMessage` values. Validation errors (DIFE-0004, DIFE-0005, DIFE-0006, DIFE-4000, DIFE-4001, DIFE-5005, etc.) return `REJECTED_BY_PROVIDER` status, while system errors return `ERROR` status.

### MOL Payment

| Scenario | HTTP Code | Error Code | Description |
|----------|-----------|------------|-------------|
| `success` | 200 | - | Payment initiated successfully |
| `processing` | 200 | - | Payment processing |
| `timeout_pending` | 200 | - | Payment in PROCESSING status that never completes (timeout scenario) |
| `validation_error` | 200 | 400 | Validation failed |
| `rejected` | 200 | 403 | Payment rejected |
| `timeout_4017` | 200 | MOL-4017 | Time-out declared by MOL |
| `timeout_4019` | 200 | MOL-4019 | Timeout with the account owner bank |
| `mol_5005` | 200 | MOL-5005 | Invalid creditor key type format |
| `mol_4003` | 200 | MOL-4003 | Inbound bank classifier not found |
| `mol_4006` | 200 | MOL-4006 | Error in the validations of the account of the Financial Consumer Recipient |
| `mol_4007` | 200 | MOL-4007 | Invalid account number of the Receiving Client |
| `mol_4008` | 200 | MOL-4008 | Incorrect identification of the Receiving Client |
| `mol_4009` | 200 | MOL-4009 | Payment method type of the Receiving Client is incorrect |
| `mol_4010` | 200 | MOL-4010 | Receiving Client account does not exist |
| `mol_4011` | 200 | MOL-4011 | Risk control due to suspicion of fraud |
| `mol_4012` | 200 | MOL-4012 | Exceeds the maximum amount for low-value deposits |
| `mol_4013` | 200 | MOL-4013 | Exceeds the maximum amount of the payment network |
| `mol_4014` | 200 | MOL-4014 | Exceeds the maximum amount of the Receiving Participant |
| `server_error` | 500 | - | Server error |

### MOL Query

| Scenario | HTTP Code | Description |
|----------|-----------|-------------|
| `success` | 200 | Successful query with results |
| `not_found` | 200 | Payment not found |
| `server_error` | 500 | Server error |

## Run E2E Tests

```bash
npm run test:e2e
```

## Verify Mountebank

### Check status

```bash
curl http://localhost:2525/imposters
```

### Verify specific imposters

```bash
curl http://localhost:2525/imposters/4545  # OAuth
curl http://localhost:2525/imposters/4546  # DIFE
curl http://localhost:2525/imposters/4547  # MOL
```

### Test mock endpoints

```bash
# OAuth
curl -X POST "http://localhost:4545/token?grant_type=client_credentials" \
  -H "Authorization: Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0" \
  -H "Content-Type: application/x-www-form-urlencoded"

# DIFE
curl -X POST http://localhost:4546/v1/key/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-access-token-for-testing" \
  -d '{
    "correlation_id": "test-123",
    "key": {
      "type": "O",
      "value": "@COLOMBIA"
    },
    "time_marks": {
      "C110": "2023-10-30T14:45:12.345",
      "C120": "2023-10-30T14:47:10.102"
    }
  }'
```

## Dynamic Error Simulation from Request

You can simulate different errors directly from your transfer request by setting specific values in the request fields. Mountebank will automatically detect these values and respond with the corresponding error.

### MOL Payment Errors

Set the `description` field in your request to trigger specific MOL errors. The description value must **exactly match** the scenario name:

```json
{
  "transactionId": "TX-0017",
  "transaction": {
    "amount": {
      "value": 110000.00,
      "currency": "COP"
    },
    "description": "timeout_4019"
  },
  "transactionParties": {
    "payee": {
      "accountInfo": {
        "value": "0096666875"
      }
    }
  }
}
```

**Important:** The `description` value must be exactly one of the scenario names below (case-sensitive). If it doesn't match any scenario, Mountebank will return a successful response by default.

**Available MOL error scenarios:**
- `timeout_pending` - Payment in PROCESSING status that never completes (simulates timeout scenario)
- `timeout_4017` - MOL-4017: Time-out declared by MOL
- `timeout_4019` - MOL-4019: Timeout with the account owner bank
- `mol_5005` - MOL-5005: Invalid creditor key type format
- `mol_4003` - MOL-4003: Inbound bank classifier not found
- `mol_4006` - MOL-4006: Error in the validations of the account of the Financial Consumer Recipient
- `mol_4007` - MOL-4007: Invalid account number of the Receiving Client
- `mol_4008` - MOL-4008: Incorrect identification of the Receiving Client
- `mol_4009` - MOL-4009: Payment method type of the Receiving Client is incorrect
- `mol_4010` - MOL-4010: Receiving Client account does not exist
- `mol_4011` - MOL-4011: Risk control due to suspicion of fraud
- `mol_4012` - MOL-4012: Exceeds the maximum amount for low-value deposits
- `mol_4013` - MOL-4013: Exceeds the maximum amount of the payment network
- `mol_4014` - MOL-4014: Exceeds the maximum amount of the Receiving Participant
- `validation_error` - HTTP 400: Validation failed
- `rejected` - HTTP 403: Payment rejected
- `processing` - Payment in PENDING status
- `server_error` - HTTP 500: Internal server error

**Default behavior:** If no matching scenario is found, the request will return a successful response with `status: 'PROCESSING'`.

### DIFE Key Resolution Errors

Set the `accountInfo.value` field in your request to trigger specific DIFE errors. The value must **exactly match** the scenario name:

```json
{
  "transactionId": "TX-0017",
  "transaction": {
    "amount": {
      "value": 110000.00,
      "currency": "COP"
    },
    "description": "Test transfer"
  },
  "transactionParties": {
    "payee": {
      "accountInfo": {
        "value": "invalid_key_5005"
      }
    }
  }
}
```

**Important:** The `accountInfo.value` must be exactly one of the scenario names below (case-sensitive). If it doesn't match any scenario, Mountebank will return a successful key resolution by default.

**DIFE success scenarios:**

| Key | Type | Person | Account | Description |
|-----|------|--------|---------|-------------|
| `@COLOMBIA` | O (Alphanumeric) | N (Natural) | CAHO | Basic alphanumeric key - Person Natural with savings account |
| `@TIMEOUT` | O (Alphanumeric) | N (Natural) | CAHO | Timeout testing scenario |
| `3001234567` | M (Mobile) | N (Natural) | CAHO | Mobile number - 10 digits starting with 3 |
| `TEST@EXAMPLE.COM` | E (Email) | N (Natural) | CCTE | Email key - Checking account |
| `0012345678` | B (Business Code) | L (Legal) | CCTE | Business code - Legal person (company) |
| `1234567890` | NRIC (ID Number) | N (Natural) | DBMO | Identification number - Low amount deposit |
| `@CORRIENTE` | O (Alphanumeric) | N (Natural) | CCTE | Alphanumeric - Checking account |
| `INCLUSIVO@BANCO.COM` | E (Email) | N (Natural) | DBMI | Email - Inclusive low amount deposit |
| `3209876543` | M (Mobile) | N (Natural) | DORD | Mobile - Ordinary deposit with Transfiya |

**Available DIFE error scenarios:**
- `@TIMEOUT` - Key resolution for timeout scenario (returns specific execution_id: `c090c73be331b56150e6c1f012a81387d0234ab44760549de678be19f9f2514a`)
- `invalid_key_5005` - DIFE-5005: Invalid key format (email validation)
- `@INVALIDKEY` - DIFE-4000: Invalid key format
- `key_not_found` - DIFE-0004: Key does not exist or is canceled
- `key_suspended` - DIFE-0005: Key suspended by client
- `key_suspended_participant` - DIFE-0006: Key suspended by participant
- `dife_timeout` - DIFE-5000: Timeout error
- `dife_0001` - DIFE-0001: Key already registered with same financial institution, different account
- `dife_0002` - DIFE-0002: Key already registered with same account
- `dife_0003` - DIFE-0003: Key already registered with another financial institution
- `dife_0007` - DIFE-0007: Not enough privileges to perform operation
- `dife_0008` - DIFE-0008: Unexpected error in DICE API
- `dife_5001` - DIFE-5001: Another request already processing this payload (duplication)
- `dife_5003` - DIFE-5003: Participant does not exist
- `dife_9999` - DIFE-9999: Unexpected error occurred
- `server_error` - HTTP 500: Server error

**All DIFE Error Codes Mapped:**

The following DIFE error codes are mapped in the system:

**Validation Errors (REJECTED_BY_PROVIDER):**
- DIFE-0004, DIFE-0005, DIFE-0006, DIFE-0007, DIFE-0009, DIFE-0010, DIFE-0011, DIFE-0012, DIFE-0013, DIFE-0014, DIFE-0015, DIFE-0016, DIFE-0018, DIFE-4000, DIFE-4001, DIFE-5004, DIFE-5005, DIFE-5006, DIFE-5007, DIFE-5010, DIFE-5011, DIFE-5012, DIFE-5013, DIFE-5014, DIFE-5015, DIFE-5016, DIFE-5017, DIFE-5018, DIFE-5019, DIFE-5021, DIFE-5022, DIFE-5023, DIFE-5024, DIFE-5025, DIFE-5026

**System Errors (ERROR):**
- DIFE-0001, DIFE-0002, DIFE-0003, DIFE-0008, DIFE-5000, DIFE-5001, DIFE-5002, DIFE-5003, DIFE-5008, DIFE-5009, DIFE-5010, DIFE-5011, DIFE-5014, DIFE-5015, DIFE-5020, DIFE-9991, DIFE-9992, DIFE-9993, DIFE-9994, DIFE-9995, DIFE-9996, DIFE-9997, DIFE-9998, DIFE-9999

**Timeout Errors (TIMEOUT_ERROR):**
- DIFE-5000

**Key Suspended (KEY_SUSPENDED):**
- DIFE-0005, DIFE-0006, DIFE-5012, DIFE-5017

**Key Not Found (KEY_NOT_FOUND_OR_CANCELED):**
- DIFE-0004, DIFE-5009

**Invalid Key Format (INVALID_KEY_FORMAT):**
- DIFE-4000, DIFE-4001, DIFE-5005, DIFE-0016

**Default behavior:** If no matching scenario is found, the request will return a successful key resolution.

## Customize Imposters

To customize imposter responses, edit `src/configuration/setup/mountebank.service.ts` for development or use the Mountebank API:

```bash
curl -X PUT http://localhost:2525/imposters/4545 \
  -H "Content-Type: application/json" \
  -d '{
    "port": 4545,
    "protocol": "http",
    "stubs": [{
      "predicates": [{
        "equals": {
          "method": "POST",
          "path": "/token"
        }
      }],
      "responses": [{
        "is": {
          "statusCode": 200,
          "headers": {"Content-Type": "application/json"},
          "body": {
            "access_token": "your-custom-token",
            "token_type": "Bearer",
            "expires_in": 3600
          }
        }
      }]
    }]
  }'
```

## Troubleshooting

### Mountebank doesn't start

- Check that ports are not in use: `lsof -i :2525`
- Review application logs for specific errors
- Ensure `mountebank.enabled=true` is in your JSON configuration

### Imposters don't respond

- Verify imposters are configured: `curl http://localhost:2525/imposters`
- Review application logs on startup
- Verify URLs are configured correctly

### Application cannot connect

- Verify Mountebank is running: `curl http://localhost:2525/imposters`
- Review application logs
- Ensure ports are not blocked

## DIFE Error Codes Reference

All DIFE error codes are mapped to appropriate `TransferMessage` values and response codes. The following table shows all supported DIFE error codes:

### Validation Errors (REJECTED_BY_PROVIDER - HTTP 422)

| Code | Description | TransferMessage |
|------|-------------|----------------|
| DIFE-0004 | The key does not exist or is canceled | KEY_NOT_FOUND_OR_CANCELED |
| DIFE-0005 | The key is suspended by the client | KEY_SUSPENDED |
| DIFE-0006 | The key is suspended by the participant | KEY_SUSPENDED |
| DIFE-0007 | There are not enough privileges to perform this operation | VALIDATION_FAILED |
| DIFE-0009 | Session error (validation errors) | VALIDATION_FAILED |
| DIFE-0010 | The NIT must be 9 digits | VALIDATION_FAILED |
| DIFE-0011 | The payment method number exceeds 34 digits | VALIDATION_FAILED |
| DIFE-0012 | The {field} must be one of those registered in the global dictionary | VALIDATION_FAILED |
| DIFE-0013 | For a natural person, at least the first name and last name must be filled out | VALIDATION_FAILED |
| DIFE-0014 | For legal entities, the name in the Dsplnm and Nn must be the same | VALIDATION_FAILED |
| DIFE-0015 | The length for the name of a legal or natural person is exceeded | VALIDATION_FAILED |
| DIFE-0016 | The key must comply with the additional rules | INVALID_KEY_FORMAT |
| DIFE-0018 | The CreDtTm field format is not in UTC-05 format | VALIDATION_FAILED |
| DIFE-4000 | Invalid key format | INVALID_KEY_FORMAT |
| DIFE-4001 | Invalid key format | INVALID_KEY_FORMAT |
| DIFE-5004 | The {field} must be one of {options} | VALIDATION_FAILED |
| DIFE-5005 | The {field} has an invalid format. {details} | INVALID_KEY_FORMAT |
| DIFE-5006 | The header {field} is required | VALIDATION_FAILED |
| DIFE-5007 | This participant is not allowed to perform this operation | VALIDATION_FAILED |
| DIFE-5010 | The key is already registered with the same financial institution, but with a different account | KEY_RESOLUTION_ERROR |
| DIFE-5011 | The key is already registered with the same account | KEY_RESOLUTION_ERROR |
| DIFE-5012 | The key is suspended by the {field} | KEY_SUSPENDED |
| DIFE-5013 | The key is already registered with another financial institution | KEY_RESOLUTION_ERROR |
| DIFE-5014 | The key is already registered and is in the cancellation period | KEY_RESOLUTION_ERROR |
| DIFE-5015 | The key is already registered and is suspended | KEY_RESOLUTION_ERROR |
| DIFE-5016 | The payload request is invalid. {detail} | VALIDATION_FAILED |
| DIFE-5017 | The key has exceeded the maximum number of block renewals {renewals} | KEY_SUSPENDED |
| DIFE-5018 | The field {field} does not have the specified size. {details} | VALIDATION_FAILED |
| DIFE-5019 | The field {field} is required | VALIDATION_FAILED |
| DIFE-5021 | The deadline for reactivating the key has expired | KEY_RESOLUTION_ERROR |
| DIFE-5022 | Type {block_type} can only be used on keys suspended by the {field} | KEY_RESOLUTION_ERROR |
| DIFE-5023 | Key suspended not yet expired | KEY_RESOLUTION_ERROR |
| DIFE-5024 | At least one of the fields {fields} must be filled in | VALIDATION_FAILED |
| DIFE-5025 | The page exceeds the maximum number of pages for this search | VALIDATION_FAILED |
| DIFE-5026 | The external id field must not be filled in and will be returned in the request body | VALIDATION_FAILED |

### System Errors (ERROR - HTTP 500)

| Code | Description | TransferMessage |
|------|-------------|----------------|
| DIFE-0001 | The key is already registered with the same financial institution, but with a different account | KEY_RESOLUTION_ERROR |
| DIFE-0002 | The key is already registered with the same account | KEY_RESOLUTION_ERROR |
| DIFE-0003 | The key is already registered with another financial institution | KEY_RESOLUTION_ERROR |
| DIFE-0008 | An unexpected error occurred in the DICE API | KEY_RESOLUTION_ERROR |
| DIFE-5000 | Timeout | TIMEOUT_ERROR |
| DIFE-5001 | Another request is already processing this payload (duplication) | KEY_RESOLUTION_ERROR |
| DIFE-5002 | The key is already registered and is in the cancellation period. Please try again in {days} days | KEY_RESOLUTION_ERROR |
| DIFE-5003 | The participant does not exist | KEY_RESOLUTION_ERROR |
| DIFE-5008 | The key does not exist or is canceled | KEY_NOT_FOUND_OR_CANCELED |
| DIFE-5009 | The key does not exist or is canceled | KEY_NOT_FOUND_OR_CANCELED |
| DIFE-5020 | The participant is inactive | KEY_RESOLUTION_ERROR |
| DIFE-9991 | An unexpected error has occurred and it is not possible to identify the execution control for this processing | KEY_RESOLUTION_ERROR |
| DIFE-9992 | An unexpected error occurred while processing the message for the federated directory | KEY_RESOLUTION_ERROR |
| DIFE-9993 | An unexpected error occurred while processing the message in the federated directory | KEY_RESOLUTION_ERROR |
| DIFE-9994 | An unexpected error occurred while processing the message for the centralized directory | KEY_RESOLUTION_ERROR |
| DIFE-9995 | An unexpected error occurred while processing the message in the centralized directory | KEY_RESOLUTION_ERROR |
| DIFE-9996 | An unexpected error occurred while accessing the processing execution control | KEY_RESOLUTION_ERROR |
| DIFE-9997 | An unexpected error occurred while accessing the key | KEY_RESOLUTION_ERROR |
| DIFE-9998 | An unexpected error occurred while accessing the participant | KEY_RESOLUTION_ERROR |
| DIFE-9999 | An unexpected error occurred | KEY_RESOLUTION_ERROR |

## MOL Error Codes Reference

All MOL error codes are mapped to appropriate `TransferMessage` values and response codes. The following table shows all supported MOL error codes:

### Payment Errors

| Code | Description | TransferMessage | HTTP Status |
|------|-------------|----------------|-------------|
| MOL-4003 | Inbound bank classifier not found | VALIDATION_FAILED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4006 | Error in the validations of the account of the Financial Consumer Recipient | VALIDATION_FAILED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4007 | Invalid account number of the Receiving Client | INVALID_ACCOUNT_NUMBER | 422 (REJECTED_BY_PROVIDER) |
| MOL-4008 | Incorrect identification of the Receiving Client | VALIDATION_FAILED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4009 | Payment method type of the Receiving Client is incorrect | VALIDATION_FAILED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4010 | Receiving Client's account does not exist | INVALID_ACCOUNT_NUMBER | 422 (REJECTED_BY_PROVIDER) |
| MOL-4011 | Risk control due to suspicion of fraud | PAYMENT_REJECTED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4012 | Exceeds the maximum amount for low-value deposits, ordinary or inclusive | PAYMENT_REJECTED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4013 | Exceeds the maximum amount of the SPBVI | PAYMENT_REJECTED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4014 | Exceeds the maximum amount of the Receiving Participant | PAYMENT_REJECTED | 422 (REJECTED_BY_PROVIDER) |
| MOL-4017 | Time-out declared by MOL | TIMEOUT_ERROR | 500 (ERROR) |
| MOL-4019 | Time-out declared by SPBVI Receptor | TIMEOUT_ERROR | 500 (ERROR) |
| MOL-5005 | Invalid creditor key type format | VALIDATION_FAILED | 422 (REJECTED_BY_PROVIDER) |

**Note:** All MOL error codes from 4003-4014 and 5005 are validation errors that return `REJECTED_BY_PROVIDER` status (HTTP 422). Timeout errors (MOL-4017, MOL-4019) return `ERROR` status (HTTP 500).

## References

- [Mountebank Documentation](http://www.mbtest.org/)
- [@moka1177/mountebank-manager](https://www.npmjs.com/package/@moka1177/mountebank-manager)
