# Flujo de Transferencias con Webhook

## Resumen del Cambio Arquitectónico

Este documento describe el cambio arquitectónico implementado para el flujo de transferencias, donde ahora el endpoint `/transfer` espera confirmación asíncrona vía webhook en lugar de devolver `PENDING` inmediatamente.

## Flujo Anterior (Sincrónico)

```
Cliente → POST /transfer → DIFE → MOL → Responde PENDING → Cliente recibe PENDING
```

El cliente recibía `PENDING` y debía consultar posteriormente el estado.

## Flujo Nuevo (Asíncrono con Webhook)

```
Cliente → POST /transfer → DIFE → MOL → Espera (50s) ← Webhook confirma → Responde APPROVED/DECLINED
                                              ↓
                                        Timeout (50s)
                                              ↓
                                        Responde PENDING
```

### Descripción del Flujo

1. **Cliente envía request** a `POST /api/v1/transfer`
2. **TransferUseCase** resuelve la clave con DIFE
3. **TransferUseCase** crea el pago en MOL (que devuelve `endToEndId`)
4. **TransferUseCase** registra la transferencia pendiente y **espera hasta 50 segundos**
5. **Proveedor externo** llama al webhook `POST /api/v1/webhook` con:
   ```json
   {
     "endToEndId": "E2E-123",
     "finalState": "SUCCESS" | "REJECTED_BY_PROVIDER"
   }
   ```
6. **WebhookController** resuelve la promesa pendiente
7. **TransferUseCase** devuelve al cliente:
   - `SUCCESS` si el webhook confirma aprobación
   - `REJECTED_BY_PROVIDER` si el webhook confirma rechazo
   - `PENDING` con mensaje "Payment pending" si pasa el timeout de 50s

## Componentes Implementados

### 1. PendingTransferService

**Ubicación:** `src/core/service/pending-transfer.service.ts`

Servicio que gestiona las transferencias en espera de confirmación.

**Métodos:**
- `waitForCallback(transactionId, endToEndId)`: Registra una transferencia y devuelve una promesa que se resuelve cuando llega el callback o se agota el timeout de 50s
- `resolveCallback(endToEndId, finalState)`: Resuelve una transferencia pendiente con el estado final
- `getPendingCount()`: Retorna el número de transferencias pendientes
- `clearAll()`: Limpia todas las transferencias pendientes

### 2. WebhookController

**Ubicación:** `src/infrastructure/entrypoint/rest/webhook.controller.ts`

Controlador REST que recibe las confirmaciones del proveedor externo.

**Endpoint:** `POST /api/v1/webhook`

**Request Body:**
```typescript
{
  endToEndId: string;
  finalState: 'SUCCESS' | 'REJECTED_BY_PROVIDER';
}
```

**Responses:**
- `200 OK` con `{ status: 'ACCEPTED', message: '...' }` si encuentra la transferencia
- `200 OK` con `{ status: 'IGNORED', message: '...' }` si no encuentra la transferencia (ya expiró o no existe)

### 3. WebhookCallbackDto

**Ubicación:** `src/infrastructure/entrypoint/dto/webhook-callback.dto.ts`

DTO con validación para el request del webhook:
```typescript
{
  @IsString()
  endToEndId: string;

  @IsIn(['APPROVED', 'REJECTED_BY_PROVIDER'])
  finalState: 'APPROVED' | 'REJECTED_BY_PROVIDER';
}
```

### 4. TransferResponseCode Actualizado

**Ubicación:** `src/infrastructure/entrypoint/dto/transfer-response.dto.ts`

Estados posibles de respuesta:
- `APPROVED`: Transferencia aprobada por el proveedor
- `PENDING`: Transferencia en proceso cuando se agota el tiempo de espera (timeout controlado)
- `REJECTED_BY_PROVIDER`: Transferencia rechazada por el proveedor
- `VALIDATION_FAILED`: Falló validación de request

**NOTA:** `PENDING` se usa únicamente para indicar timeout controlado cuando no se recibió confirmación final.

### 5. TransferUseCase Actualizado

**Cambios principales:**

1. Inyecta `PendingTransferService`
2. Después de crear el pago en MOL:
   - Valida que exista `endToEndId` en la respuesta
   - Registra la transferencia como pendiente
   - Espera 50 segundos por el callback
   - Maneja timeout con mensaje específico
   - Devuelve `APPROVED` o `REJECTED_BY_PROVIDER` según el callback

### 6. MolPaymentProvider Actualizado

**Cambio:** Ya no devuelve `PENDING`. Cuando MOL responde exitosamente (status `PROCESSING`, `COMPLETED` o `PENDING`), devuelve `APPROVED` como estado temporal. El estado final lo determinará el webhook.

## Configuración de Módulos

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

### Nuevos Tests Creados

1. **`test/unit/core/service/pending-transfer.service.spec.ts`**
   - Verifica registro y resolución de callbacks
   - Verifica timeout de 50 segundos
   - Verifica prevención de duplicados
   - Verifica limpieza de timeouts

2. **`test/unit/infrastructure/entrypoint/rest/webhook.controller.spec.ts`**
   - Verifica aceptación de callbacks válidos
   - Verifica manejo de callbacks para transferencias desconocidas
   - Verifica estados APPROVED y DECLINED

### Tests Actualizados

1. **`test/unit/core/usecase/transfer.usecase.spec.ts`**
   - Agrega mock de `PendingTransferService`
   - Verifica flujo completo con webhook APPROVED
   - Verifica flujo completo con webhook DECLINED
   - Verifica manejo de timeout
   - Verifica validación de `endToEndId`

2. **Otros tests actualizados:**
   - `mol-payment-provider.spec.ts`: Espera `APPROVED` en vez de `PENDING`
   - `transfer.controller.spec.ts`: Actualizado a nuevos códigos de respuesta
   - `http-status.mapper.spec.ts`: Tests para `APPROVED` y `DECLINED`
   - `mol-api.spec.ts`: Integration test actualizado

## Resultados de Tests

```
Test Suites: 15 passed, 15 total
Tests:       115 passed, 115 total
```

## Puntos Importantes

1. **Timeout de 50 segundos:** Si el webhook no llega en 50s, la transferencia falla con PENDING
2. **No existe PENDING:** El cliente siempre recibe una respuesta definitiva (APPROVED, DECLINED o PENDING)
3. **Thread-safe:** El servicio maneja múltiples transferencias concurrentes correctamente
4. **Idempotencia del webhook:** Si llega un callback para una transferencia ya resuelta o expirada, se ignora
5. **Logging completo:** Se loguean todos los eventos importantes del flujo

## Ejemplo de Uso

### Request Transfer
```bash
POST /api/v1/transfer
{
  "transactionId": "TXN-123",
  "transaction": {
    "amount": { "value": 100000, "currency": "COP" },
    "description": "Pago"
  },
  "transactionParties": {
    "payee": {
      "accountInfo": { "key": "3001234567" },
      "documentNumber": "1234567890" // opcional, se valida contra DIFE si viene
    }
  }
}
```

### Webhook Callback (dentro de 50s)
```bash
POST /api/v1/webhook
{
  "endToEndId": "E2E-abc123",
  "finalState": "APPROVED"
}
```

### Response Transfer (después del callback)
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

### Response Transfer (si hay timeout)
```json
{
  "transactionId": "TXN-123",
  "responseCode": "PENDING",
  "message": "Payment pending"
}
```

## Mejoras Futuras Posibles

1. **Persistencia:** Guardar transferencias pendientes en base de datos para sobrevivir reinicios
2. **Métricas:** Agregar métricas de Prometheus para timeouts, callbacks exitosos/fallidos
3. **Retry del Webhook:** Permitir múltiples intentos de callback desde el proveedor
4. **Configuración del Timeout:** Hacer el timeout de 50s configurable vía variable de entorno
5. **Webhook Security:** Agregar validación de firma/token para webhooks entrantes
