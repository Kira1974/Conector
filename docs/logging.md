# Logging Guide for Transaction Tracking

This guide explains how to track a complete transaction using CHARON system logs.

## EventID / TraceID / CorrelationID Strategy

The logging system uses a strategic approach to correlate logs:

- **`eventId`**: Always the `transactionId` - Use this to search for all logs of a specific transaction
- **`traceId`**: Always the `transactionId` - Use this to trace the complete transaction flow
- **`correlationId`**: External system identifiers (`endToEndId`, `internalId`, or DIFE `correlationId`) - Use this to correlate with external systems (MOL, DIFE)

### How to get the transactionId?

- **In the transfer flow**: The `transactionId` comes in the initial client request.
- **In the webhook flow**: The `transactionId` is obtained from `PendingTransfer` using the `endToEndId` that comes in the webhook.

### Log search strategies

**To search for all logs of a transaction** (recommended):
```
eventId: "TXN-123456789"
```
or
```
traceId: "TXN-123456789"
```

**To correlate with external systems**:
```
correlationId: "20251212830513238CRB001765562058859"  // endToEndId from MOL
correlationId: "001765573744184"  // correlationId from DIFE
correlationId: "internal-id-123"  // internalId from MOL
```

**You can also search by**:
```
transactionId: "TXN-123456789"
endToEndId: "20251212830513238CRB001765562058859"
```

## Important Logs

All network-related logs follow a standardized naming convention: `NETWORK_REQUEST <SERVICE>` and `NETWORK_RESPONSE <SERVICE>`, where `<SERVICE>` can be:
- `DIFE` - Key resolution service
- `MOL` - Payment service
- `MOL_QUERY` - Payment status query service
- `AUTH` - Authentication service
- `WEBHOOK` - Webhook confirmation

This standardization makes it easy to search for all network requests/responses by using:
- `NETWORK_REQUEST` - All outgoing network requests
- `NETWORK_RESPONSE` - All incoming network responses
- `NETWORK_REQUEST MOL` - All MOL payment requests
- `NETWORK_RESPONSE AUTH` - All authentication responses
- etc.

### CHARON Request

**When generated**: At the start of each transfer request to the `/api/v1/transfer` endpoint.

**Main fields**:
- `eventId`: Transaction's transactionId
- `traceId`: Transaction's transactionId
- `correlationId`: Transaction's transactionId
- `transactionId`: Unique transaction ID
- `method`: HTTP method (POST)
- `amount`: Transaction amount
- `currency`: Currency (COP)
- `requestBody`: Complete request body (formatted JSON)

**Example**:
```json
{
  "level": "INFO",
  "message": "CHARON Request",
  "eventId": "TXN-123456789",
  "traceId": "TXN-123456789",
  "correlationId": "TXN-123456789",
  "transactionId": "TXN-123456789",
  "method": "POST",
  "amount": 100000,
  "currency": "COP",
  "requestBody": "{ ... }"
}
```

### CHARON Response

**When generated**: After completing transfer processing, before returning the response to the client.

**Main fields**:
- `eventId`: Transaction's transactionId (for searching all transaction logs)
- `traceId`: Transaction's transactionId (for tracing the transaction flow)
- `correlationId`: End-to-end ID from MOL (if available) or transactionId (for correlating with external systems)
- `transactionId`: Unique transaction ID
- `endToEndId`: End-to-end ID from MOL response (if available)
- `status`: HTTP response code (200, 400, 422, 500)
- `responseCode`: Transaction response code (APPROVED, PENDING, REJECTED_BY_PROVIDER, VALIDATION_FAILED, ERROR)
- `responseBody`: Complete response body (formatted JSON)

**Example**:
```json
{
  "level": "INFO",
  "message": "CHARON Response",
  "eventId": "TXN-123456789",
  "traceId": "TXN-123456789",
  "correlationId": "20251212830513238CRB001765562058859",
  "transactionId": "TXN-123456789",
  "endToEndId": "20251212830513238CRB001765562058859",
  "status": 200,
  "responseCode": "APPROVED",
  "responseBody": "{ ... }"
}
```

**Note**: `correlationId` is the `endToEndId` from MOL when available, allowing correlation with external systems.

### NETWORK_REQUEST DIFE

**When generated**: Before sending the request to DIFE to resolve the payee's key.

**Main fields**:
- `eventId`: Transaction's transactionId (for searching all transaction logs)
- `traceId`: Transaction's transactionId (for tracing the transaction flow)
- `correlationId`: DIFE correlationId (for correlating with DIFE system)
- `transactionId`: Unique transaction ID
- `url`: DIFE endpoint URL
- `method`: HTTP method (POST)
- `requestBody`: DIFE request body (formatted JSON)
- `headers`: HTTP headers (only if `enableHttpHeadersLog` is enabled)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_REQUEST DIFE",
  "eventId": "TXN-123456789",
  "traceId": "TXN-123456789",
  "correlationId": "001765573744184",
  "transactionId": "TXN-123456789",
  "url": "https://dife.example.com/v1/key/resolve",
  "method": "POST",
  "requestBody": "{ ... }"
}
```

**Note**: `correlationId` is the DIFE correlationId used in the request, allowing correlation with DIFE system logs.

### NETWORK_RESPONSE DIFE

**When generated**: After receiving the response from DIFE.

**Main fields**:
- `eventId`: Transaction's transactionId (for searching all transaction logs)
- `traceId`: Transaction's transactionId (for tracing the transaction flow)
- `correlationId`: DIFE correlationId (for correlating with DIFE system)
- `transactionId`: Unique transaction ID
- `status`: DIFE HTTP response code
- `responseBody`: DIFE response body (formatted JSON)
- `externalTransactionId`: DIFE execution ID (if available)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_RESPONSE DIFE",
  "eventId": "TXN-123456789",
  "traceId": "TXN-123456789",
  "correlationId": "001765573744184",
  "transactionId": "TXN-123456789",
  "status": 200,
  "responseBody": "{ ... }",
  "externalTransactionId": "dife-execution-id-123"
}
```

**Note**: `correlationId` is the DIFE correlationId, allowing correlation with DIFE system logs.

### NETWORK_REQUEST MOL

**When generated**: Before sending the request to MOL to create the payment.

**Main fields**:
- `eventId`: Transaction's transactionId (for searching all transaction logs)
- `traceId`: Transaction's transactionId (for tracing the transaction flow)
- `correlationId`: MOL internalId (for correlating with MOL system)
- `transactionId`: Unique transaction ID
- `internalId`: MOL internal_id (correlationId from DIFE)
- `url`: MOL endpoint URL
- `method`: HTTP method (POST)
- `requestBody`: MOL request body (formatted JSON)
- `headers`: HTTP headers (only if `enableHttpHeadersLog` is enabled)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_REQUEST MOL",
  "eventId": "TXN-123456789",
  "traceId": "TXN-123456789",
  "correlationId": "001765573744184",
  "transactionId": "TXN-123456789",
  "internalId": "001765573744184",
  "url": "https://mol.example.com/v1/payment",
  "method": "POST",
  "requestBody": "{ ... }"
}
```

**Note**: `correlationId` is the MOL `internalId` (which is the DIFE correlationId), allowing correlation with MOL payment creation logs.

### NETWORK_RESPONSE MOL

**When generated**: After receiving the response from MOL.

**Main fields**:
- `eventId`: Transaction's transactionId (for searching all transaction logs)
- `traceId`: Transaction's transactionId (for tracing the transaction flow)
- `correlationId`: MOL endToEndId (if available) or internalId (for correlating with MOL system)
- `transactionId`: Unique transaction ID
- `internalId`: MOL internal_id (correlationId from DIFE)
- `endToEndId`: MOL end-to-end ID (if available)
- `status`: MOL HTTP response code
- `responseBody`: MOL response body (formatted JSON)
- `externalTransactionId`: MOL end-to-end ID (if available)
- `executionId`: MOL execution ID (if available)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_RESPONSE MOL",
  "eventId": "TXN-123456789",
  "traceId": "TXN-123456789",
  "correlationId": "20251212830513238CRB001765562058859",
  "transactionId": "TXN-123456789",
  "internalId": "001765573744184",
  "endToEndId": "20251212830513238CRB001765562058859",
  "status": 200,
  "responseBody": "{ ... }",
  "externalTransactionId": "20251212830513238CRB001765562058859",
  "executionId": "202512120BANKCRB0005cf3fb6381"
}
```

**Note**: `correlationId` is the MOL `endToEndId` when available, allowing correlation with MOL system and webhook logs.

### NETWORK_REQUEST MOL_QUERY

**When generated**: Before querying MOL payment status via polling.

**Main fields**:
- `eventId`: Internal ID or end-to-end ID (for searching transaction logs)
- `traceId`: Internal ID or end-to-end ID (for tracing the transaction flow)
- `correlationId`: End-to-end ID or internal ID (for correlating with MOL system)
- `internalId`: MOL internal_id (if available)
- `endToEndId`: MOL end-to-end ID (if available)
- `url`: MOL query endpoint URL
- `method`: HTTP method (GET)
- `headers`: HTTP headers (only if `enableHttpHeadersLog` is enabled)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_REQUEST MOL_QUERY",
  "eventId": "internal-id-123",
  "traceId": "internal-id-123",
  "correlationId": "20251212830513238CRB001765562058859",
  "internalId": "internal-id-123",
  "endToEndId": "20251212830513238CRB001765562058859",
  "url": "https://mol.example.com/v1/payments?end_to_end_id=...",
  "method": "GET"
}
```

### NETWORK_RESPONSE MOL_QUERY

**When generated**: After receiving the response from MOL query.

**Main fields**:
- `eventId`: Internal ID or end-to-end ID (for searching transaction logs)
- `traceId`: Internal ID or end-to-end ID (for tracing the transaction flow)
- `correlationId`: End-to-end ID or internal ID (for correlating with MOL system)
- `internalId`: MOL internal_id (if available)
- `endToEndId`: MOL end-to-end ID (if available)
- `status`: MOL HTTP response code
- `responseBody`: MOL query response body (formatted JSON)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_RESPONSE MOL_QUERY",
  "eventId": "internal-id-123",
  "traceId": "internal-id-123",
  "correlationId": "20251212830513238CRB001765562058859",
  "internalId": "internal-id-123",
  "endToEndId": "20251212830513238CRB001765562058859",
  "status": 200,
  "responseBody": "{ ... }"
}
```

### NETWORK_REQUEST WEBHOOK

**When generated**: When a confirmation webhook arrives from the external provider.

**Main fields**:
- `eventId`: Transaction's transactionId (obtained from PendingTransfer, for searching all transaction logs)
- `traceId`: Transaction's transactionId (for tracing the transaction flow)
- `correlationId`: Webhook's endToEndId (for correlating with external webhook system)
- `transactionId`: Unique transaction ID (obtained from PendingTransfer)
- `endToEndId`: Webhook's end-to-end ID
- `executionId`: Webhook's execution ID
- `settlementStatus`: Settlement status (SUCCESS, SETTLED, REJECTED, ERROR)
- `notificationId`: Notification ID
- `source`: Webhook source (credibanco)
- `eventName`: Event name
- `requestBody`: Complete webhook body (formatted JSON)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_REQUEST WEBHOOK",
  "eventId": "TXN-123456789",
  "traceId": "TXN-123456789",
  "correlationId": "20251212830513238CRB001765562058859",
  "transactionId": "TXN-123456789",
  "endToEndId": "20251212830513238CRB001765562058859",
  "executionId": "202512120BANKCRB0005cf3fb6381",
  "settlementStatus": "SUCCESS",
  "notificationId": "NOTIF-001",
  "source": "credibanco",
  "eventName": "payment-originator-settlement-result",
  "requestBody": "{ ... }"
}
```

**Note**: `eventId` and `traceId` are the `transactionId` (obtained from PendingTransfer), while `correlationId` is the `endToEndId` from the webhook, allowing correlation with external webhook systems.

### NETWORK_REQUEST AUTH

**When generated**: Before requesting an OAuth authentication token.

**Main fields**:
- `url`: Authentication endpoint URL
- `method`: HTTP method (POST)
- `headers`: HTTP headers (redacted if `enableHttpHeadersLog` is disabled)

**Note**: This log does not include `eventId` because it can be generated at any time (even before a specific transaction).

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_REQUEST AUTH",
  "url": "https://auth.example.com/token?grant_type=client_credentials",
  "method": "POST",
  "headers": {
    "Authorization": "Basic ***REDACTED***",
    "Content-Type": "application/x-www-form-urlencoded"
  }
}
```

### NETWORK_RESPONSE AUTH

**When generated**: After receiving the response from the OAuth authentication service.

**Main fields**:
- `status`: HTTP response code
- `statusText`: HTTP status text
- `responseHeaders`: Response headers (always redacted)
- `responseData`: Response data (token always redacted as `***REDACTED***`)

**Example**:
```json
{
  "level": "INFO",
  "message": "NETWORK_RESPONSE AUTH",
  "status": 200,
  "statusText": "OK",
  "responseHeaders": {
    "content-type": "application/json"
  },
  "responseData": {
    "access_token": "***REDACTED***",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

## HTTP Headers Logging Configuration

By default, HTTP headers are not included in logs for security reasons. However, you can enable them for debugging.

### How to enable/disable headers

Headers are controlled by the `logging.enableHttpHeadersLog` configuration in the environment configuration file.

**Location**: `deployment/{env}/app.json`

**Example**:
```json
{
  "logging": {
    "enableHttpHeadersLog": false,
    "environment": "development",
    "minLevel": "DEBUG",
    "pretty": false,
    "colors": false
  }
}
```

### Behavior

- **`enableHttpHeadersLog: false`** (recommended for production):
  - Headers are **not included** in DIFE and MOL logs
  - AUTH headers are always shown but **redacted** (Authorization: `***REDACTED***`)

- **`enableHttpHeadersLog: true`** (only for development/debugging):
  - Headers are **included in full** in DIFE and MOL logs
  - AUTH headers are shown **without redaction** (⚠️ **WARNING**: Contains credentials)

### ⚠️ Security Warning

**NEVER** enable `enableHttpHeadersLog: true` in production. Headers contain:
- Authentication tokens (Bearer tokens)
- Basic authentication credentials
- Sensitive information that could compromise system security

## Important Errors

### Validation Errors (HTTP 400 / VALIDATION_FAILED)

These errors indicate that the request does not meet business validations:

- **`DOCUMENT_MISMATCH`**: The payee's document number does not match the key resolution
- **`ACCOUNT_MISMATCH`**: The BREB account number does not match the key resolution
- **`INVALID_KEY_FORMAT`**: The key format is invalid (local validation before calling DIFE)

**Logs to review**:
- `CHARON Request` → Check the `requestBody` to validate sent data
- `CHARON Response` → Check `responseCode: VALIDATION_FAILED` and `message`

### Provider Rejection Errors (HTTP 422 / REJECTED_BY_PROVIDER)

These errors indicate that the network/provider rejected the transaction:

- **`KEY_NOT_FOUND_OR_CANCELED`**: The key does not exist or is canceled (DIFE-0004)
- **`KEY_SUSPENDED`**: The key is suspended (DIFE-0005, DIFE-0006)
- **`PAYMENT_REJECTED`**: Payment was rejected by MOL (MOL-4016, MOL-4011, etc.)
- **`INVALID_KEY_FORMAT`**: Invalid key format according to DIFE (DIFE-4000, DIFE-4001, DIFE-5005)
- **`INVALID_ACCOUNT_NUMBER`**: Invalid account number (MOL-4007, MOL-4010)

**Logs to review**:
- `NETWORK_REQUEST DIFE` → Check the sent key
- `NETWORK_RESPONSE DIFE` → Check error code (`networkCode`) and message (`networkMessage`)
- `NETWORK_REQUEST MOL` → Check sent payment data
- `NETWORK_RESPONSE MOL` → Check error code (`networkCode`) and message (`networkMessage`)
- `CHARON Response` → Check `responseCode: REJECTED_BY_PROVIDER`, `networkCode` and `networkMessage`

### Network/System Errors (HTTP 500 / ERROR)

These errors indicate technical problems:

- **`KEY_RESOLUTION_ERROR`**: Error resolving the key with DIFE
- **`PAYMENT_PROCESSING_ERROR`**: Error processing payment with MOL
- **`TIMEOUT_ERROR`**: Timeout in an external call
- **`NETWORK_ERROR`**: Network or connection error

**Logs to review**:
- `DIFE Request` → Verify if the request was sent correctly
- `DIFE Response` → Check HTTP code (500, 502, 503, 504)
- `MOL Request` → Verify if the request was sent correctly
- `MOL Response` → Check HTTP code (500, 502, 503, 504)
- `AUTH Request/Response` → Check for authentication issues

### Timeout Errors

- **`Transfer confirmation timeout (controlled)`**: Webhook confirmation was not received within the time limit (50 seconds by default)
- **`Request timeout`**: Timeout in a specific HTTP call (DIFE or MOL)

**Logs to review**:
- `Waiting for transfer confirmation` → Check the configured `timeoutSeconds`
- `Transfer confirmation timeout (controlled)` → Check the `endToEndId` and verify if the webhook arrived after the timeout
- `NETWORK_REQUEST WEBHOOK` → Verify if it arrived after the timeout

### Authentication Errors

- **`invalid token`**: The OAuth token is invalid or expired
- **`UnauthorizedException`**: Authentication error with the provider

**Logs to review**:
- `NETWORK_REQUEST AUTH` → Verify the authentication request
- `NETWORK_RESPONSE AUTH` → Check HTTP code (401, 403)
- `NETWORK_REQUEST DIFE` → Verify if the token was used correctly
- `NETWORK_REQUEST MOL` → Verify if the token was used correctly

## Typical Log Flow

For a successful transaction, the log order would be:

1. **CHARON Request** → Transaction start
2. **NETWORK_REQUEST AUTH** / **NETWORK_RESPONSE AUTH** → Token acquisition (if not cached)
3. **NETWORK_REQUEST DIFE** → Key resolution
4. **NETWORK_RESPONSE DIFE** → Key resolved successfully
5. **NETWORK_REQUEST MOL** → Payment creation
6. **NETWORK_RESPONSE MOL** → Payment created with `endToEndId`
7. **Waiting for transfer confirmation** → Waiting for webhook
8. **NETWORK_REQUEST WEBHOOK** → Webhook received
9. **Transfer confirmation processed successfully** → Confirmation processed
10. **CHARON Response** → Final response to client

## Transaction Search

### By transactionId

Search for all logs of a specific transaction:

```
transactionId: "TXN-123456789"
```

### By endToEndId

If you only have the `endToEndId` from the webhook:

```
endToEndId: "20251212830513238CRB001765562058859"
```

### By externalTransactionId

If you have the execution ID from DIFE or MOL:

```
externalTransactionId: "dife-execution-id-123"
executionId: "202512120BANKCRB0005cf3fb6381"
```

### By error code

To find all transactions with a specific error:

```
networkCode: "DIFE-0004"
networkCode: "MOL-4016"
responseCode: "REJECTED_BY_PROVIDER"
```

## Best Practices

1. **Search by `eventId` or `traceId` using `transactionId`**: This is the most reliable way to find all logs of a complete transaction. Use `eventId: "TXN-123456789"` to get all logs from CHARON Request through CHARON Response.

2. **Use `correlationId` to correlate with external systems**: When you need to find logs related to a specific external system identifier:
   - Use `correlationId: "endToEndId"` to find MOL-related logs
   - Use `correlationId: "internalId"` to find MOL payment creation logs
   - Use `correlationId: "difeCorrelationId"` to find DIFE-related logs

3. **Review the complete flow**: Don't just look at the error log, review all logs from `CHARON Request` to `CHARON Response` using `eventId` or `traceId`.

4. **Check timestamps**: Logs include timestamps that allow you to identify where time was lost.

5. **Compare Request/Response**: Compare what was sent (`Request`) with what was received (`Response`) to identify discrepancies.

6. **Review `networkCode` and `networkMessage`**: These fields contain detailed information about the external provider error.

7. **Keep `enableHttpHeadersLog: false` in production**: Only enable it in development when you need specific debugging.
