# Hexagonal Architecture - Charon Project

This project implements a hexagonal architecture (Ports & Adapters) organized into 4 main layers:

## 📁 Folder Structure

```
src/
├── configuration/          # Application configuration
│   ├── entrypoint-config/
│   ├── provider-config/
│   ├── app.module.ts
│   └── main.ts
├── core/                  # Business logic (Domain)
│   ├── constant/          # Enums, constants and validations
│   ├── entity/            # Domain entities and DTOs
│   ├── exception/         # Domain exceptions
│   ├── model/             # Data models
│   ├── provider/          # Port interfaces (contracts)
│   ├── usecase/           # Use cases and business services
│   └── util/              # Domain utilities
└── infrastructure/        # Infrastructure layer
    ├── provider/          # Output adapters
    │   ├── clientes-http/ # External HTTP clients
    │   ├── mapper/        # Transformation mappers
    │   └── repositories/  # Data repositories
    └── entrypoint/        # Input adapters
        ├── rest/          # REST controllers
        └── mapper/        # Input/output mappers
```

## 🎯 Architecture Layers

### 1. Configuration
- **Responsibility**: Application configuration and bootstrap
- **Contains**: 
  - NestJS modules
  - Application entry point (`main.ts`)
  - Entrypoint and provider configuration

### 2. Core (Domain)
- **Responsibility**: Pure business logic, independent of frameworks
- **Subfolders**:
  - `constant/`: Domain enumerations and constants (e.g., `KeyTypeDife`, `TransferResponseCode`)
  - `entity/`: Domain entities (e.g., `Transfer`, `AccountKey`, `Amount`)
  - `exception/`: Domain exceptions (e.g., `KeyResolutionException`, `PaymentProcessingException`)
  - `model/`: Data models (e.g., `KeyResolutionRequest`, `KeyResolutionResponse`)
  - `provider/`: Interfaces (ports) that define contracts with external services (e.g., `IDifeProvider`, `IMolPaymentProvider`)
  - `usecase/`: Use cases and business services (e.g., `TransferUseCase`, `PendingTransferService`)
  - `util/`: Domain utilities (e.g., `calculateKeyType`, `generateCorrelationId`, `ResilienceConfigService`)

**Rule**: Core must NOT depend on external layers (neither frameworks nor infrastructure)

### 3. Infrastructure
- **Responsibility**: Contains all input and output adapters of the system
- **Structure**:
  
  #### 3.1 Provider (Output Adapters)
  - **Responsibility**: Implementation of adapters that core uses to communicate with external services
  - **Subfolders**:
    - `clientes-http/`: Clients for external APIs (DIFE, OAuth, etc.)
    - `mapper/`: Transformers from external data to domain entities
    - `repositories/`: Database access
  - **Rule**: Providers implement interfaces defined in `core/provider`

  #### 3.2 Entrypoint (Input Adapters)
  - **Responsibility**: Expose system functionality through different protocols
  - **Subfolders**:
    - `rest/`: HTTP/REST controllers (e.g., `TransferController`, `WebhookController`)
    - `dto/`: Data Transfer Objects for requests/responses
    - `rest/util/`: HTTP utilities (e.g., `HttpStatusMapper`)
    - `rest/interceptors/`: Global interceptors (e.g., `GlobalExceptionFilter`, `GlobalValidationPipe`)
  - **Rule**: Entrypoints invoke core use cases and do NOT contain business logic

## 🔄 Data Flow

### Synchronous Flow (Queries)
```
Request → Entrypoint → UseCase (Core) → Provider → External Service
                          ↓                             ↓
                       Entities                      Response
                       Constants                        ↓
                       Utils                    ← Mapper → Entrypoint → Response
```

### Asynchronous Flow with Webhook (Transfers)
```
1. Transfer Start:
   POST /transfer → TransferController → TransferUseCase
                                           ↓
                                    DifeProvider (key resolution)
                                           ↓
                                    MolProvider (payment creation) → MOL API
                                           ↓
                                    PendingTransferService.waitForCallback()
                                           ↓
                                    [WAIT up to 50s]

2. External Callback:
   POST /webhook → WebhookController → PendingTransferService.resolveCallback()
                                           ↓
                                    [Resolve pending promise]
                                           ↓
3. Final Response:
   TransferUseCase receives callback → Response (APPROVED/DECLINED/ERROR)
```

**Possible states:**
- ✅ **APPROVED**: Webhook confirms in < 50s
- ❌ **DECLINED**: Webhook rejects in < 50s  
- ⚠️ **ERROR**: 50s timeout or error in the process

## ✅ Design Principles

1. **Dependency Rule**: Dependencies only point inward (toward core)
2. **Single Responsibility**: Each layer has a clear responsibility
3. **Interface Segregation**: Small and specific interfaces in `core/provider`
4. **Dependency Inversion**: Core defines interfaces, providers implement them
5. **Separation of Concerns**: Business logic in core, technical details in infrastructure

## 🔀 Implemented Patterns

### 1. Hexagonal Architecture (Ports & Adapters)
- **Core**: Defines interfaces (ports)
- **Infrastructure**: Implements adapters
- **Benefit**: Core independence from frameworks and external libraries

### 2. Asynchronous Callback with Polling Fallback
- **Location**: `PendingTransferService` (core/usecase)
- **Purpose**: Manage transfers waiting for external confirmation via webhook with active fallback
- **Features**:
  - **Primary Webhook**: Waits for webhook for up to the time configured in `TRANSFER_TIMEOUT_MS`
- **Polling Fallback**: After `WEBHOOK_POLLING_START_DELAY_MS` starts active queries
- **Active Query**: Calls MOL GET endpoint every `POLLING_INTERVAL_MS`
- **Dynamic Attempts**: Makes as many attempts as fit in the total available time
- **Resolution**: If MOL returns successful status, resolves the main promise
- **Timeout**: If no success after the total configured time → ERROR

#### Polling Fallback Flow
1. **Registration**: Pending transfer waits for webhook
2. **Partial Timeout**: If webhook doesn't arrive in `WEBHOOK_POLLING_START_DELAY_MS` → starts polling
3. **Active Query**: `MolPaymentProvider.queryPaymentStatus(endToEndId)` every `POLLING_INTERVAL_MS`
4. **Evaluation**: 
   - ✅ `COMPLETED/SUCCESS/APPROVED` → Resolves `APPROVED`
   - ❌ `FAILED/ERROR/REJECTED` → Resolves `DECLINED`
   - ⏳ `PROCESSING/PENDING` → Continues polling
5. **Resolution**: If webhook arrives first → cancels polling and resolves normally

### 3. DTO Pattern
- **Request DTOs**: Input validation with `class-validator`
- **Response DTOs**: Consistent response structure
- **Mappers**: Transformation between external DTOs and internal models

### 4. Exception Handling
- **GlobalExceptionFilter**: Captures and normalizes exceptions
- **Custom Exceptions**: Domain-specific exceptions
- **HTTP Status Mapping**: Automatic mapping of response codes to HTTP status

## 📦 Imports

Each main folder exports its content through `index.ts` files:

```typescript
// ✅ Correct
import { DifeGetKeysService } from '@core/usecase';
import { HttpClientService } from '@infrastructure/provider/clientes-http';
import { KeyTypeDife } from '@core/constant';
import { DifeKeysController } from '@infrastructure/entrypoint/rest/dife-keys.controller';

// ❌ Incorrect (avoid deep paths without aliases)
import { DifeGetKeysService } from '../../core/usecase/get-key.service';
```

## Path Aliases Configured

```typescript
// tsconfig.json
{
  "@configuration/*": ["src/configuration/*"],
  "@core/*": ["src/core/*"],
  "@infrastructure/*": ["src/infrastructure/*"],
  "@infrastructure/provider/*": ["src/infrastructure/provider/*"],
  "@infrastructure/entrypoint/*": ["src/infrastructure/entrypoint/*"]
}
```

## 🧪 Testing

The structure facilitates testing by allowing:

### Unit Tests
- **Use cases**: Mock providers to test isolated business logic
  - Example: `transfer.usecase.spec.ts` - 7 scenarios including webhook callbacks
- **Domain services**: Mock external dependencies
  - Example: `pending-transfer.service.spec.ts` - 10 callback management scenarios
- **Controllers**: Mock use cases
  - Example: `webhook.controller.spec.ts` - 3 callback reception scenarios

### Integration Tests
- **Providers**: Test adapters with mocked external services
  - Example: `mol-api.spec.ts`, `dife-api.spec.ts`
- **HTTP Clients**: Verify request/response format

### Current Coverage
```
Test Suites: 15 passed
Tests: 117 passed
```

**Covered areas:**
- ✅ Complete transfer flow with webhook
- ✅ Resource and timeout management
- ✅ Error handling in all layers
- ✅ DTO validation
- ✅ Data mapping between layers

## 📝 Benefits

- ✅ **Maintainability**: Organized and easy to locate code
- ✅ **Testability**: Easy to mock external dependencies (117 tests passing)
- ✅ **Scalability**: Add new entrypoints or providers without affecting core
- ✅ **Independence**: Change frameworks without affecting business logic
- ✅ **Clarity**: Clear separation of responsibilities
- ✅ **Resilience**: Automatic resource management and configurable timeouts
- ✅ **Production-Ready**: High volume handling with automatic cleanup

## 🔧 Environment Configuration

Key environment variables (`.env.example`):

```bash
# External service timeouts
DIFE_TIMEOUT_MS=30000
MOL_TIMEOUT_MS=30000
OAUTH_TIMEOUT_MS=15000

# OAuth Cache Configuration
OAUTH_CACHE_TTL_SECONDS=3000  # OAuth token cache TTL in seconds (default: 3000 = 50 minutes)

# Total transfer timeout
TRANSFER_TIMEOUT_MS=50000  # Maximum total time to resolve transfer (from request arrival)

# Webhook Fallback Polling Configuration
WEBHOOK_FALLBACK_TIMEOUT_MS=30000  # Time before starting polling fallback
POLLING_INTERVAL_MS=5000           # Interval between polling queries
MAX_POLLING_ATTEMPTS=6             # Maximum number of polling attempts

# Resilience
RESILIENCE_HTTP_TIMEOUT=20000
RESILIENCE_RETRY_ATTEMPTS=3
```

## 🚀 Complete Transfer Flow

### 1. Client initiates transfer
```http
POST /api/v1/transfer
{
  "transactionId": "TXN-123",
  "transaction": {
    "amount": { "value": 100000, "currency": "COP" }
  },
  "transactionParties": {
    "payee": { "accountInfo": { "key": "3001234567" } }
  }
}
```

### 2. System processes
1. **TransferController** receives request
2. **TransferUseCase** coordinates:
   - Calls **DifeProvider** to resolve key (type: 'M', 'E', 'O', 'NRIC', 'B')
   - Calls **MolProvider** to create payment → receives `endToEndId`
   - Registers in **PendingTransferService** and waits for webhook (time configured in `TRANSFER_TIMEOUT_MS`)
   - **If webhook doesn't arrive in `WEBHOOK_POLLING_START_DELAY_MS`**: Starts polling fallback every `POLLING_INTERVAL_MS`

### 3. Two possible confirmation paths:

#### Option A: Webhook (priority)
```http
POST /api/v1/webhook
{
  "endToEndId": "E2E-abc123",
  "finalState": "APPROVED"  // or "DECLINED"
}
```

#### Option B: Polling Fallback (if webhook doesn't arrive)
- **Query**: `GET /v1/payments?end_to_end_id=E2E-abc123` (with timeout `MOL_QUERY_TIMEOUT_MS`)
- **Evaluation**: 
  - ✅ `COMPLETED/APPROVED` → Resolves `APPROVED`
  - ❌ `FAILED/ERROR/REJECTED` → Resolves `DECLINED`
  - ⏳ `PROCESSING/PENDING` → Continues polling
- **Timeout**: Dynamic - makes as many attempts as fit in total time `TRANSFER_TIMEOUT_MS`

### 4. System responds to client
```json
{
  "transactionId": "TXN-123",
  "responseCode": "APPROVED",  // APPROVED | PENDING | REJECTED_BY_PROVIDER | VALIDATION_FAILED | ERROR
  "message": "Transfer approved",
  "externalTransactionId": "MOL-xyz",
  "additionalData": {
    "endToEndId": "E2E-abc123"
  }
}
```

**Note**: Timeout scenarios (fully configurable):
- ❌ **No webhook in `WEBHOOK_POLLING_START_DELAY_MS`**: Starts polling fallback
- ❌ **No success in polling**: Continues until total timeout `TRANSFER_TIMEOUT_MS`
- ⏳ **Total timeout**: After `TRANSFER_TIMEOUT_MS` without webhook or success → `PENDING` response

```
"The final response from the provider was never received."
```

## 🆕 New Components Added

### MolPaymentQueryRequestDto
- **Location**: `infrastructure/provider/http-clients/dto/mol-payment-query.dto.ts`
- **Purpose**: DTO for MOL status queries with validation
- **Factory Methods**:
  ```typescript
  MolPaymentQueryRequestDto.byInternalId('123456')
  MolPaymentQueryRequestDto.byEndToEndId('abc123')
  MolPaymentQueryRequestDto.byDateRange(start, end)
  ```

### MolPaymentStatusMapper
- **Location**: `infrastructure/provider/http-clients/dto/mol-payment-status-mapper.ts`
- **Purpose**: MOL status to internal status mapping
- **Mapping**: PROCESSING/COMPLETED/PENDING → PENDING (following existing business logic)

### IMolPaymentProvider.queryPaymentStatus()
- **Interface**: Method added for status queries with configurable timeout
- **Validation**: At least one parameter required, date range max. 1 day
- **Error Handling**: Robust handling with detailed logging
