# Transfer Flow with Webhook

## Architectural Change Summary

This document describes the architectural change implemented for the transfer flow, where the `/transfer` endpoint now waits for asynchronous confirmation via webhook instead of immediately returning `PENDING`.

## Previous Flow (Synchronous)

```
Client → POST /transfer → DIFE → MOL → Responds PENDING → Client receives PENDING
```

The client received `PENDING` and had to query the status later.

## New Flow (Asynchronous with Webhook)

```
Client → POST /transfer → DIFE → MOL → Waits (50s) ← Webhook confirms → Responds APPROVED/DECLINED
                                              ↓
                                        Timeout (50s)
                                              ↓
                                        Responds PENDING
```

### Flow Description

1. **Client sends request** to `POST /api/v1/transfer`
2. **TransferUseCase** resolves key with DIFE
3. **TransferUseCase** creates payment in MOL (which returns `endToEndId`)
4. **TransferUseCase** registers pending transfer and **waits up to 50 seconds**
5. **External provider** calls webhook `POST /api/v1/webhook` with:
   ```json
   {
     "endToEndId": "E2E-123",
     "finalState": "SUCCESS" | "REJECTED_BY_PROVIDER"
   }
   ```
6. **WebhookController** resolves pending promise
7. **TransferUseCase** returns to client:
   - `SUCCESS` if webhook confirms approval
   - `REJECTED_BY_PROVIDER` if webhook confirms rejection
   - `PENDING` with message "Payment pending" if 50s timeout occurs

## Implemented Components

### 1. PendingTransferService

**Location:** `src/core/service/pending-transfer.service.ts`

Service that manages transfers waiting for confirmation.

**Methods:**
- `waitForCallback(transactionId, endToEndId)`: Registers a transfer and returns a promise that resolves when callback arrives or 50s timeout expires
- `resolveCallback(endToEndId, finalState)`: Resolves a pending transfer with final state
- `getPendingCount()`: Returns the number of pending transfers
- `clearAll()`: Clears all pending transfers

### 2. WebhookController

**Location:** `src/infrastructure/entrypoint/rest/webhook.controller.ts`

REST controller that receives confirmations from external provider.

**Endpoint:** `POST /api/v1/webhook`

**Request Body:**
```typescript
{
  endToEndId: string;
  finalState: 'SUCCESS' | 'REJECTED_BY_PROVIDER';
}
```

**Responses:**
- `200 OK` with `{ status: 'ACCEPTED', message: '...' }` if transfer is found
- `200 OK` with `{ status: 'IGNORED', message: '...' }` if transfer is not found (already expired or doesn't exist)

### 3. WebhookCallbackDto

**Location:** `src/infrastructure/entrypoint/dto/webhook-callback.dto.ts`

DTO with validation for webhook request:
```typescript
{
  @IsString()
  endToEndId: string;

  @IsIn(['APPROVED', 'REJECTED_BY_PROVIDER'])
  finalState: 'APPROVED' | 'REJECTED_BY_PROVIDER';
}
```

### 4. TransferResponseCode Updated

**Location:** `src/infrastructure/entrypoint/dto/transfer-response.dto.ts`

Possible response states:
- `APPROVED`: Transfer approved by provider
- `PENDING`: Transfer in process when wait time expires (controlled timeout)
- `REJECTED_BY_PROVIDER`: Transfer rejected by provider
- `VALIDATION_FAILED`: Request validation failed

**NOTE:** `PENDING` is used only to indicate controlled timeout when final confirmation was not received.

### 5. TransferUseCase Updated

**Main changes:**

1. Injects `PendingTransferService`
2. After creating payment in MOL:
   - Validates that `endToEndId` exists in response
   - Registers transfer as pending
   - Waits 50 seconds for callback
   - Handles timeout with specific message
   - Returns `APPROVED` or `REJECTED_BY_PROVIDER` according to callback

### 6. MolPaymentProvider Updated

**Change:** No longer returns `PENDING`. When MOL responds successfully (status `PROCESSING`, `COMPLETED` or `PENDING`), returns `APPROVED` as temporary state. Final state will be determined by webhook.

## Module Configuration

### CoreModule
```typescript
providers: [TransferUseCase, PendingTransferService]
exports: [TransferUseCase, PendingTransferService]
```

### EntrypointModule
```typescript
controllers: [TransferController, WebhookController]
```

## Testing

### New Tests Created

1. **`test/unit/core/service/pending-transfer.service.spec.ts`**
   - Verifies callback registration and resolution
   - Verifies 50 second timeout
   - Verifies duplicate prevention
   - Verifies timeout cleanup

2. **`test/unit/infrastructure/entrypoint/rest/webhook.controller.spec.ts`**
   - Verifies acceptance of valid callbacks
   - Verifies handling of callbacks for unknown transfers
   - Verifies APPROVED and DECLINED states

### Updated Tests

1. **`test/unit/core/usecase/transfer.usecase.spec.ts`**
   - Adds mock of `PendingTransferService`
   - Verifies complete flow with APPROVED webhook
   - Verifies complete flow with DECLINED webhook
   - Verifies timeout handling
   - Verifies `endToEndId` validation

2. **Other updated tests:**
   - `mol-payment-provider.spec.ts`: Expects `APPROVED` instead of `PENDING`
   - `transfer.controller.spec.ts`: Updated to new response codes
   - `http-status.mapper.spec.ts`: Tests for `APPROVED` and `DECLINED`
   - `mol-api.spec.ts`: Updated integration test

## Test Results

```
Test Suites: 15 passed, 15 total
Tests:       115 passed, 115 total
```

## Important Points

1. **50 second timeout:** If webhook doesn't arrive in 50s, transfer fails with PENDING
2. **No PENDING exists:** Client always receives a definitive response (APPROVED, DECLINED or PENDING)
3. **Thread-safe:** Service correctly handles multiple concurrent transfers
4. **Webhook idempotency:** If a callback arrives for an already resolved or expired transfer, it is ignored
5. **Complete logging:** All important flow events are logged

## Usage Example

### Transfer Request
```bash
POST /api/v1/transfer
{
  "transactionId": "TXN-123",
  "transaction": {
    "amount": { "value": 100000, "currency": "COP" },
    "description": "Payment"
  },
  "transactionParties": {
    "payee": {
      "accountInfo": { "key": "3001234567" },
      "documentNumber": "1234567890" // optional, validated against DIFE if provided
    }
  }
}
```

### Webhook Callback (within 50s)
```bash
POST /api/v1/webhook
{
  "endToEndId": "E2E-abc123",
  "finalState": "APPROVED"
}
```

### Transfer Response (after callback)
```json
{
  "transactionId": "TXN-123",
  "responseCode": "APPROVED",
  "message": "Transfer approved",
  "externalTransactionId": "MOL-xyz789",
  "additionalData": {
    "endToEndId": "E2E-abc123",
    "molExecutionId": "MOL-xyz789"
  }
}
```

### Transfer Response (if timeout)
```json
{
  "transactionId": "TXN-123",
  "responseCode": "PENDING",
  "message": "Payment pending"
}
```

## Possible Future Improvements

1. **Persistence:** Save pending transfers to database to survive restarts
2. **Metrics:** Add Prometheus metrics for timeouts, successful/failed callbacks
3. **Webhook Retry:** Allow multiple callback attempts from provider
4. **Timeout Configuration:** Make 50s timeout configurable via environment variable
5. **Webhook Security:** Add signature/token validation for incoming webhooks
