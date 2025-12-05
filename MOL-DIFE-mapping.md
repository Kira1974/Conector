# MOL API Field Mapping Documentation

## Overview

This document describes how data flows from the entrypoint request through the Transfer domain model to the MOL API payment request structure.

## Data Flow Architecture

```
Entrypoint Request → Transfer Entity → PaymentRequest → MOL API Request
```

## 1. Entrypoint Request Structure

### TransferRequestDto
```typescript
{
  amount: {
    value: number;
    currency: string;
  };
  description: string;
  additionalData: {
    // Required fields from user request (UPPERCASE)
    KEY?: string;                    // Account key value (required)
    CELLPHONE?: string;              // Cellphone number (required)
    COMPANY_NAME?: string;           // Company name (required)
    
    // Optional payer fields from user request (UPPERCASE)
    PAYER_IDENTIFICATION_TYPE?: string; // Payer identification type
    PAYER_IDENTIFICATION_NUMBER?: string; // Payer identification number
    PAYER_NAME?: string;              // Payer name
    PAYER_PAYMENT_TYPE?: string;       // Payer payment method type
    PAYER_PAYMENT_VALUE?: string;      // Payer payment method value
    
    // Optional creditor fields from user request (UPPERCASE)
    CREDITOR_IDENTIFICATION_TYPE?: string; // Creditor identification type
    CREDITOR_IDENTIFICATION_NUMBER?: string; // Creditor identification number
    CREDITOR_PARTICIPANT_NIT?: string; // Creditor participant NIT
    CREDITOR_PARTICIPANT_SPBVI?: string; // Creditor participant SPBVI code
    CREDITOR_PAYMENT_TYPE?: string;    // Creditor payment method type
    CREDITOR_PAYMENT_VALUE?: string;   // Creditor payment method value
    CREDITOR_NAME?: string;           // Creditor name
    
    [key: string]: any;             // Flexible additional fields
  };
  correlationId?: string;
  transactionId?: string;            // MOL key resolution ID
}
```

**Note:** Request fields are validated in UPPERCASE (KEY, CELLPHONE, COMPANY_NAME are required). DIFE response data is merged in lowercase format.

### Mixed-Case Data Flow Example

The `additionalData` map contains mixed case keys from different sources:

```typescript
// Original request (UPPERCASE)
{
  additionalData: {
    KEY: "3001234567",
    CELLPHONE: "3001234567", 
    COMPANY_NAME: "Test Company",
    PAYER_NAME: "John Doe"
  }
}

// After DIFE integration (mixed case)
{
  additionalData: {
    // From user request (UPPERCASE)
    KEY: "3001234567",
    CELLPHONE: "3001234567",
    COMPANY_NAME: "Test Company", 
    PAYER_NAME: "John Doe",
    
    // From DIFE response (lowercase)
    keyType: "O",
    keyValue: "@COLOMBIA",
    creditorName: "Juan Carlos Pérez"
  }
}
```

**Important:** DIFE-extracted fields (lowercase) take precedence over user-provided creditor fields. Request fields (uppercase) are used for validation and payer information.

## 2. Transfer Entity Structure

### Transfer Domain Model
```typescript
{
  id: string;
  correlationId: string;
  amount: Amount;
  accountKey: AccountKey;
  status: TransferStatus;
  createdAt: Date;
  updatedAt: Date;
  paymentId?: string;
  endToEndId?: string;
  error?: string;
  transactionId?: string;           // Flows from entrypoint
  additionalData?: Record<string, any>; // Flows from entrypoint
}
```

## 3. PaymentRequest Structure

### PaymentRequest Interface
```typescript
{
  internalId: string;
  value: number;
  currency?: string;
  description?: string;
  additionalData?: Record<string, any>; // Contains DIFE data + request fields
  correlationId?: string;
  transactionId?: string;            // Used as key_resolution_id
}
```

## 4. MOL API Request Structure

### MolPaymentRequestDto
```typescript
{
  additional_informations: string;   // ← PaymentRequest.description
  billing_responsible: string;       // ← Fixed: "DEBT"
  creditor: {
    identification: {
      type: string;                  // ← additionalData.identificationType || "CITIZENSHIP_ID"
      value: string;                 // ← additionalData.identificationNumber || "1234567890"
    };
    key: {
      type: string;                  // ← additionalData.keyType || "MAIL"
      value: string;                 // ← additionalData.keyValue || "john@doe.com"
    };
    name: string;                    // ← additionalData.creditorName || "Jane Doe"
    participant: {
      id: string;                    // ← additionalData.participantId || "654987654"
      spbvi: string;                 // ← additionalData.spbvi || "CRB"
    };
    payment_method: {
      currency: string;              // ← Fixed: "170"
      type: string;                  // ← additionalData.creditorPaymentType || "SAVINGS_ACCOUNT"
      value: string;                 // ← additionalData.creditorPaymentValue || "321456987"
    };
  };
  initiation_type: string;           // ← Fixed: "QR_STATIC"
  internal_id: string;               // ← PaymentRequest.internalId
  key_resolution_id: string;         // ← PaymentRequest.transactionId
  payer: {
    identification: {
      type: string;                  // ← additionalData.payerIdentificationType || "CITIZENSHIP_ID"
      value: string;                 // ← additionalData.payerIdentificationNumber || "1234567890"
    };
    name: string;                    // ← additionalData.payerName || "John Doe"
    payment_method: {
      currency: string;              // ← Fixed: "170"
      type: string;                  // ← additionalData.payerPaymentType || "SAVINGS_ACCOUNT"
      value: string;                 // ← additionalData.payerPaymentValue || "321456987"
    };
  };
  qr_code_id: string;                // ← Fixed: "" (empty)
  time_mark: {
    T110: string;                    // ← Fixed: "" (empty)
    T120: string;                    // ← Fixed: "" (empty)
  };
  transaction_amount: string;        // ← PaymentRequest.value.toString()
  transaction_type: string;          // ← Fixed: "BREB"
}
```

## Field Mapping Summary

| MOL Field | Source | Default Value | Notes |
|-----------|--------|---------------|-------|
| `additional_informations` | `PaymentRequest.description` | - | Maps directly |
| `billing_responsible` | Fixed | `"DEBT"` | Always DEBT |
| `creditor.identification.type` | `additionalData.CREDITOR_IDENTIFICATION_TYPE` | Required | From request |
| `creditor.identification.value` | `additionalData.CREDITOR_IDENTIFICATION_NUMBER` | Required | From request |
| `creditor.key.type` | `additionalData.keyType` | `"O"` | From DIFE |
| `creditor.key.value` | `additionalData.keyValue` | Required | From DIFE |
| `creditor.name` | `additionalData.creditorName` | Required | From DIFE |
| `creditor.participant.id` | `additionalData.CREDITOR_PARTICIPANT_NIT` | Required | From request |
| `creditor.participant.spbvi` | `additionalData.CREDITOR_PARTICIPANT_SPBVI` | Required | From request |
| `creditor.payment_method.currency` | `request.currency` (mapped) | Mapped | COP→170, USD→840, EUR→978 |
| `creditor.payment_method.type` | `additionalData.creditorPaymentType` | Required | From DIFE |
| `creditor.payment_method.value` | `additionalData.creditorPaymentValue` | Required | From DIFE |
| `initiation_type` | Fixed | `"QR_STATIC"` | Always QR_STATIC |
| `internal_id` | `PaymentRequest.internalId` | - | Maps directly |
| `key_resolution_id` | `PaymentRequest.transactionId` | `""` | From entrypoint |
| `payer.identification.type` | `additionalData.PAYER_IDENTIFICATION_TYPE` | Required | From request |
| `payer.identification.value` | `additionalData.PAYER_IDENTIFICATION_NUMBER` | Required | From request |
| `payer.name` | `additionalData.PAYER_NAME` | Required | From request |
| `payer.payment_method.currency` | `request.currency` (mapped) | Mapped | COP→170, USD→840, EUR→978 |
| `payer.payment_method.type` | `additionalData.PAYER_PAYMENT_TYPE` | Required | From request |
| `payer.payment_method.value` | `additionalData.PAYER_PAYMENT_VALUE` | Required | From request |
| `qr_code_id` | Fixed | `""` | Always empty |
| `time_mark.T110` | Fixed | `""` | Always empty |
| `time_mark.T120` | Fixed | `""` | Always empty |
| `transaction_amount` | `PaymentRequest.value` | - | Converted to string |
| `transaction_type` | Fixed | `"BREB"` | Always BREB |

## DIFE Integration Notes

### Expected DIFE Data in additionalData
When DIFE key resolution is integrated, the following fields should be populated from DIFE response:

```typescript
additionalData: {
  // From DIFE key resolution response (lowercase)
  keyType: "O",                     // DIFE key type (MAIL, CELLPHONE, etc.)
  keyValue: "@COLOMBIA",            // DIFE key value
  creditorName: "Juan Carlos Pérez" // Creditor name from DIFE person data
}
```

## Error Handling

### MOL API Error Response
```typescript
{
  error: {
    code: string;        // Error code (e.g., "403")
    description: string; // Error description
    id: string;          // Error ID
  }
}
```

### Error Mapping
- MOL `error.description` → PaymentProcessingException message
- MOL `error.code` → Logged for debugging
- MOL `error.id` → Logged for debugging

## Implementation Status

✅ **Completed:**
- TransferRequestDto with transactionId and flexible additionalData
- Transfer entity with transactionId and additionalData fields
- TransferMapper updated to pass new fields
- PaymentRequest with transactionId field
- MolPaymentRequestDto with complete nested structure
- MolPaymentProvider with complete field mapping
- Currency mapping from alpha to numeric codes (COP→170, USD→840, EUR→978)
- Error handling for MOL API responses
- TransferUseCase integration with DIFE data
- All creditor fields renamed with CREDITOR_ prefix
- Removal of hardcoded defaults and fallbacks
- Comprehensive functional and unit tests
- Documentation updates

✅ **All Tests Passing:**
- 37/37 tests passing
- Functional tests for MOL API integration
- Unit tests for MolPaymentProvider
- Request structure validation

## Test Coverage

### Functional Tests
- ✅ SUCCESS response with complete data
- ✅ ERROR response with proper error handling
- ✅ Minimal request with default values
- ✅ Request structure validation

### Test Data Examples
Tests use realistic data with proper field names:
- Currency: "COP" (mapped to "170" for MOL API)
- Creditor identification: "CC", "123456789"
- Payer identification: "CC", "987654321"
- All required fields are provided in test requests

## KeyType Valores (Tipo de llave)

Los valores aceptados para `KeyType` en el dominio ahora siguen los códigos DIFE:

| Código | Descripción |
|--------|-------------|
| NRIC   | Número de identificación |
| M      | Número de celular |
| E      | Correo electrónico |
| O      | Otros |
| B      | Código de comercio (solo persona jurídica) |

> Estos reemplazan los antiguos valores (PHONE, EMAIL, CELLPHONE, ACCOUNT_NUMBER). Actualiza cualquier integración externa que dependa de los valores anteriores.
