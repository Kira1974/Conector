# Arquitectura Hexagonal - Proyecto Charon

Este proyecto implementa una arquitectura hexagonal (Ports & Adapters) organizada en 4 capas principales:

## 📁 Estructura de Carpetas

```
src/
├── configuration/          # Configuración de la aplicación
│   ├── entrypoint-config/
│   ├── provider-config/
│   ├── app.module.ts
│   └── main.ts
├── core/                  # Lógica de negocio (Dominio)
│   ├── constant/          # Enums, constantes y validaciones
│   ├── entity/            # Entidades y DTOs del dominio
│   ├── exception/         # Excepciones del dominio
│   ├── model/             # Modelos de datos
│   ├── provider/          # Interfaces de puertos (contratos)
│   ├── usecase/           # Casos de uso y servicios de negocio
│   └── util/              # Utilidades del dominio
└── infrastructure/        # Capa de Infraestructura
    ├── provider/          # Adaptadores de salida
    │   ├── clientes-http/ # Clientes HTTP externos
    │   ├── mapper/        # Mappers de transformación
    │   └── repositories/  # Repositorios de datos
    └── entrypoint/        # Adaptadores de entrada
        ├── rest/          # Controladores REST
        └── mapper/        # Mappers de entrada/salida
```

## 🎯 Capas de la Arquitectura

### 1. Configuration (Configuración)
- **Responsabilidad**: Configuración y bootstrap de la aplicación
- **Contiene**: 
  - Módulos de NestJS
  - Punto de entrada de la aplicación (`main.ts`)
  - Configuración de entrypoints y providers

### 2. Core (Núcleo / Dominio)
- **Responsabilidad**: Lógica de negocio pura, independiente de frameworks
- **Subcarpetas**:
  - `constant/`: Enumeraciones y constantes del dominio (ej: `KeyTypeDife`, `TransferResponseCode`)
  - `entity/`: Entidades de dominio (ej: `Transfer`, `AccountKey`, `Amount`)
  - `exception/`: Excepciones del dominio (ej: `KeyResolutionException`, `PaymentProcessingException`)
  - `model/`: Modelos de datos (ej: `KeyResolutionRequest`, `KeyResolutionResponse`)
  - `provider/`: Interfaces (ports) que definen contratos con servicios externos (ej: `IDifeProvider`, `IMolPaymentProvider`)
  - `usecase/`: Casos de uso y servicios de negocio (ej: `TransferUseCase`, `PendingTransferService`)
  - `util/`: Utilidades del dominio (ej: `calculateKeyType`, `generateCorrelationId`, `ResilienceConfigService`)

**Regla**: El core NO debe depender de capas externas (ni frameworks, ni infraestructura)

### 3. Infrastructure (Infraestructura)
- **Responsabilidad**: Contiene todos los adaptadores de entrada y salida del sistema
- **Estructura**:
  
  #### 3.1 Provider (Adaptadores de Salida)
  - **Responsabilidad**: Implementación de adaptadores que el core usa para comunicarse con servicios externos
  - **Subcarpetas**:
    - `clientes-http/`: Clientes para APIs externas (DIFE, OAuth, etc.)
    - `mapper/`: Transformadores de datos externos a entidades del dominio
    - `repositories/`: Acceso a bases de datos
  - **Regla**: Los providers implementan las interfaces definidas en `core/provider`

  #### 3.2 Entrypoint (Adaptadores de Entrada)
  - **Responsabilidad**: Exponer la funcionalidad del sistema a través de diferentes protocolos
  - **Subcarpetas**:
    - `rest/`: Controladores HTTP/REST (ej: `TransferController`, `WebhookController`)
    - `dto/`: Data Transfer Objects para requests/responses
    - `rest/util/`: Utilidades de HTTP (ej: `HttpStatusMapper`)
    - `rest/interceptors/`: Interceptores globales (ej: `GlobalExceptionFilter`, `GlobalValidationPipe`)
  - **Regla**: Los entrypoints invocan casos de uso del core y NO contienen lógica de negocio

## 🔄 Flujo de Datos

### Flujo Sincrónico (Consultas)
```
Request → Entrypoint → UseCase (Core) → Provider → External Service
                          ↓                             ↓
                       Entities                      Response
                       Constants                        ↓
                       Utils                    ← Mapper → Entrypoint → Response
```

### Flujo Asíncrono con Webhook (Transferencias)
```
1. Inicio de Transferencia:
   POST /transfer → TransferController → TransferUseCase
                                           ↓
                                    DifeProvider (resolución clave)
                                           ↓
                                    MolProvider (creación pago) → MOL API
                                           ↓
                                    PendingTransferService.waitForCallback()
                                           ↓
                                    [ESPERA hasta 50s]

2. Callback Externo:
   POST /webhook → WebhookController → PendingTransferService.resolveCallback()
                                           ↓
                                    [Resuelve promesa pendiente]
                                           ↓
3. Respuesta Final:
   TransferUseCase recibe callback → Response (APPROVED/DECLINED/ERROR)
```

**Estados posibles:**
- ✅ **APPROVED**: Webhook confirma en < 50s
- ❌ **DECLINED**: Webhook rechaza en < 50s  
- ⚠️ **ERROR**: Timeout de 50s o error en el proceso

## ✅ Principios de Diseño

1. **Dependency Rule**: Las dependencias solo apuntan hacia adentro (hacia el core)
2. **Single Responsibility**: Cada capa tiene una responsabilidad clara
3. **Interface Segregation**: Interfaces pequeñas y específicas en `core/provider`
4. **Dependency Inversion**: El core define interfaces, los providers las implementan
5. **Separation of Concerns**: Lógica de negocio en core, detalles técnicos en infrastructure

## 🔀 Patrones Implementados

### 1. Hexagonal Architecture (Ports & Adapters)
- **Core**: Define interfaces (ports)
- **Infrastructure**: Implementa adaptadores (adapters)
- **Beneficio**: Independencia del core respecto a frameworks y librerías externas

### 2. Callback Asíncrono con Polling Fallback
- **Ubicación**: `PendingTransferService` (core/usecase)
- **Propósito**: Gestionar transferencias que esperan confirmación externa vía webhook con respaldo activo
- **Características**:
  - **Webhook Primario**: Espera webhook por hasta el tiempo configurado en `TRANSFER_TIMEOUT_MS`
- **Polling Fallback**: Después de `WEBHOOK_POLLING_START_DELAY_MS` inicia consultas activas
- **Consulta Activa**: Llama a MOL GET endpoint cada `POLLING_INTERVAL_MS`
- **Intentos Dinámicos**: Hace tantos intentos como quepan en el tiempo total disponible
- **Resolución**: Si MOL retorna estado exitoso, resuelve la promesa principal
- **Timeout**: Si no hay éxito después del tiempo total configurado → ERROR

#### Flujo de Polling Fallback
1. **Registro**: Transferencia pendiente espera webhook
2. **Timeout Parcial**: Si no llega webhook en `WEBHOOK_POLLING_START_DELAY_MS` → inicia polling
3. **Consulta Activa**: `MolPaymentProvider.queryPaymentStatus(endToEndId)` cada `POLLING_INTERVAL_MS`
4. **Evaluación**: 
   - ✅ `COMPLETED/SUCCESS/APPROVED` → Resuelve `APPROVED`
   - ❌ `FAILED/ERROR/REJECTED` → Resuelve `DECLINED`
   - ⏳ `PROCESSING/PENDING` → Continúa polling
5. **Resolución**: Si webhook llega primero → cancela polling y resuelve normalmente

### 3. DTO Pattern
- **Request DTOs**: Validación de entrada con `class-validator`
- **Response DTOs**: Estructura consistente de respuestas
- **Mappers**: Transformación entre DTOs externos y modelos internos

### 4. Exception Handling
- **GlobalExceptionFilter**: Captura y normaliza excepciones
- **Custom Exceptions**: Excepciones específicas del dominio
- **HTTP Status Mapping**: Mapeo automático de códigos de respuesta a HTTP status

## 📦 Importaciones

Cada carpeta principal exporta su contenido a través de archivos `index.ts`:

```typescript
// ✅ Correcto
import { DifeGetKeysService } from '@core/usecase';
import { HttpClientService } from '@infrastructure/provider/clientes-http';
import { KeyTypeDife } from '@core/constant';
import { DifeKeysController } from '@infrastructure/entrypoint/rest/dife-keys.controller';

// ❌ Incorrecto (evitar rutas profundas sin alias)
import { DifeGetKeysService } from '../../core/usecase/get-key.service';
```

## Path Aliases Configurados

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

La estructura facilita el testing al permitir:

### Unit Tests
- **Casos de uso**: Mock de providers para testear lógica de negocio aislada
  - Ejemplo: `transfer.usecase.spec.ts` - 7 escenarios incluyendo webhook callbacks
- **Servicios del dominio**: Mock de dependencias externas
  - Ejemplo: `pending-transfer.service.spec.ts` - 10 escenarios de gestión de callbacks
- **Controladores**: Mock de use cases
  - Ejemplo: `webhook.controller.spec.ts` - 3 escenarios de recepción de callbacks

### Integration Tests
- **Providers**: Testear adaptadores con servicios externos mockeados
  - Ejemplo: `mol-api.spec.ts`, `dife-api.spec.ts`
- **HTTP Clients**: Verificar formato de requests/responses

### Coverage Actual
```
Test Suites: 15 passed
Tests: 117 passed
```

**Áreas cubiertas:**
- ✅ Flujo completo de transferencias con webhook
- ✅ Gestión de recursos y timeouts
- ✅ Manejo de errores en todas las capas
- ✅ Validación de DTOs
- ✅ Mapeo de datos entre capas

## 📝 Beneficios

- ✅ **Mantenibilidad**: Código organizado y fácil de ubicar
- ✅ **Testabilidad**: Fácil mockear dependencias externas (117 tests pasando)
- ✅ **Escalabilidad**: Agregar nuevos entrypoints o providers sin afectar el core
- ✅ **Independencia**: Cambiar frameworks sin afectar la lógica de negocio
- ✅ **Claridad**: Separación clara de responsabilidades
- ✅ **Resilencia**: Gestión automática de recursos y timeouts configurables
- ✅ **Production-Ready**: Manejo de alto volumen con cleanup automático

## 🔧 Configuración por Ambiente

Variables de entorno clave (`.env.example`):

```bash
# Timeouts de servicios externos
DIFE_TIMEOUT_MS=30000
MOL_TIMEOUT_MS=30000
OAUTH_TIMEOUT_MS=15000

# Timeout total de la transferencia
TRANSFER_TIMEOUT_MS=50000  # Tiempo máximo total para resolver la transferencia (desde la llegada de la petición)

# Webhook Fallback Polling Configuration
WEBHOOK_FALLBACK_TIMEOUT_MS=30000  # Tiempo antes de iniciar polling fallback
POLLING_INTERVAL_MS=5000           # Intervalo entre consultas de polling
MAX_POLLING_ATTEMPTS=6             # Máximo número de intentos de polling

# Resilience
RESILIENCE_HTTP_TIMEOUT=20000
RESILIENCE_RETRY_ATTEMPTS=3
```

## 🚀 Flujo de Transferencia Completo

### 1. Cliente inicia transferencia
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

### 2. Sistema procesa
1. **TransferController** recibe request
2. **TransferUseCase** coordina:
   - Llama **DifeProvider** para resolver clave (tipo: 'M', 'E', 'O', 'NRIC', 'B')
   - Llama **MolProvider** para crear pago → recibe `endToEndId`
   - Registra en **PendingTransferService** y espera webhook (tiempo configurado en `TRANSFER_TIMEOUT_MS`)
   - **Si no llega webhook en `WEBHOOK_POLLING_START_DELAY_MS`**: Inicia polling fallback cada `POLLING_INTERVAL_MS`

### 3. Dos posibles caminos de confirmación:

#### Opción A: Webhook (prioritario)
```http
POST /api/v1/webhook
{
  "endToEndId": "E2E-abc123",
  "finalState": "APPROVED"  // o "DECLINED"
}
```

#### Opción B: Polling Fallback (si webhook no llega)
- **Consulta**: `GET /v1/payments?end_to_end_id=E2E-abc123` (con timeout `MOL_QUERY_TIMEOUT_MS`)
- **Evaluación**: 
  - ✅ `COMPLETED/APPROVED` → Resuelve `APPROVED`
  - ❌ `FAILED/ERROR/REJECTED` → Resuelve `DECLINED`
  - ⏳ `PROCESSING/PENDING` → Continúa polling
- **Timeout**: Dinámico - hace tantos intentos como quepan en el tiempo total `TRANSFER_TIMEOUT_MS`

### 4. Sistema responde al cliente
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

**Nota**: Escenarios de timeout (totalmente configurables):
- ❌ **Sin webhook en `WEBHOOK_POLLING_START_DELAY_MS`**: Inicia polling fallback
- ❌ **Sin éxito en polling**: Continúa hasta timeout total `TRANSFER_TIMEOUT_MS`
- ⏳ **Timeout total**: Después de `TRANSFER_TIMEOUT_MS` sin webhook ni éxito → respuesta `PENDING`

```
"The final response from the provider was never received."
```

## 🆕 Nuevos Componentes Agregados

### MolPaymentQueryRequestDto
- **Ubicación**: `infrastructure/provider/http-clients/dto/mol-payment-query.dto.ts`
- **Propósito**: DTO para consultas de estado MOL con validación
- **Factory Methods**:
  ```typescript
  MolPaymentQueryRequestDto.byInternalId('123456')
  MolPaymentQueryRequestDto.byEndToEndId('abc123')
  MolPaymentQueryRequestDto.byDateRange(start, end)
  ```

### MolPaymentStatusMapper
- **Ubicación**: `infrastructure/provider/http-clients/dto/mol-payment-status-mapper.ts`
- **Propósito**: Mapeo de estados MOL a estados internos
- **Mapeo**: PROCESSING/COMPLETED/PENDING → PENDING (siguiendo lógica de negocio existente)

### IMolPaymentProvider.queryPaymentStatus()
- **Interface**: Método agregado para consultas de estado con timeout configurable
- **Validación**: Al menos un parámetro requerido, rango de fechas máx. 1 día
- **Error Handling**: Manejo robusto con logging detallado
