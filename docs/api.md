# API Cartilla Digital

## Introducción

Este documento describe el contrato actual de la API interna de **Cartilla Digital**. La API está implementada con Next.js App Router y expone endpoints para:

- siembra de datos de desarrollo
- registro y administración de gastos
- asignación de cupos
- consulta de balances
- consulta de ledger mensual
- administración básica de colaboradores

## Nota temporal sobre autenticación

La autenticación y autorización aún no están integradas con un mecanismo real de sesión o identidad corporativa.

Por ahora, algunos endpoints reciben campos como:

- `actorUserId`
- `actorRole`

Esto es **temporal** y existe solo para facilitar desarrollo y validación funcional. Más adelante estos datos deben salir del contexto autenticado del servidor y no del body del request.

## Patrones comunes de error

La API usa respuestas JSON simples para errores, normalmente con esta forma:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

Patrones comunes:

- `400`: request inválido, parámetros inválidos o body inválido
- `401`: acceso no autorizado por secreto incorrecto
- `403`: operación prohibida
- `404`: recurso no encontrado
- `409`: conflicto de negocio o de estado
- `500`: error inesperado del servidor

---

## 1. Seed de desarrollo

### Purpose

Poblar rápidamente la base de datos con datos de ejemplo para desarrollo local.

### HTTP method and path

`POST /api/dev/seed`

### Request parameters

No usa query params.

Headers requeridos:

- `x-dev-secret`

### Request body

No requiere body.

### Success response example

```json
{
  "ok": true,
  "year": 2026,
  "month": 3,
  "users": 3,
  "collaborators": 2,
  "quotas": 2,
  "expenses": 4,
  "balances": 2,
  "auditLogs": 4,
  "approverEmail": "aprobador@cartilla.local"
}
```

### Error response examples

```json
{
  "error": "UNAUTHORIZED"
}
```

```json
{
  "error": "FORBIDDEN"
}
```

### Notes about business behavior

- Solo debe usarse en desarrollo.
- Rechaza ejecución si `NODE_ENV === "production"`.
- Requiere secreto de desarrollo vía header.
- Reutiliza la misma lógica del seed CLI.

---

## 2. Registrar gasto

### Purpose

Registrar un nuevo gasto para un colaborador y actualizar el balance del mes.

### HTTP method and path

`POST /api/expenses`

### Request parameters

No usa query params.

### Request body

```json
{
  "collaboratorId": "clb_123",
  "registeredByUserId": "usr_123",
  "registeredByRole": "ADMIN",
  "expenseDate": "2026-03-08T00:00:00.000Z",
  "year": 2026,
  "month": 3,
  "amount": 75.5,
  "category": "FUEL",
  "description": "Fuel refill",
  "currency": "USD"
}
```

### Success response example

```json
{
  "expense": {
    "id": "exp_123",
    "collaboratorId": "clb_123",
    "year": 2026,
    "month": 3,
    "amount": 75.5,
    "category": "FUEL",
    "description": "Fuel refill",
    "currency": "USD",
    "registeredByUserId": "usr_123",
    "status": "ACTIVE",
    "expenseDate": "2026-03-08T00:00:00.000Z",
    "createdAt": "2026-03-08T15:00:00.000Z"
  },
  "balanceSnapshot": {
    "id": "bal_123",
    "collaboratorId": "clb_123",
    "year": 2026,
    "month": 3,
    "openingBalance": 300,
    "quotaAmount": 300,
    "executedAmount": 200.5,
    "closingBalance": 99.5,
    "currency": "USD",
    "lastExpenseDate": "2026-03-08T00:00:00.000Z",
    "recalculatedAt": "2026-03-08T15:00:00.000Z",
    "updatedAt": "2026-03-08T15:00:00.000Z"
  }
}
```

### Error response examples

```json
{
  "error": "COLLABORATOR_NOT_FOUND",
  "message": "Collaborator does not exist."
}
```

```json
{
  "error": "INSUFFICIENT_AVAILABLE_BALANCE",
  "message": "The expense exceeds the available balance for the collaborator in the selected period."
}
```

### Notes about business behavior

- El colaborador debe existir y estar activo.
- Debe existir cupo mensual para el período.
- Solo gastos `ACTIVE` cuentan en el saldo ejecutado.
- No permite saldo negativo.

---

## 3. Actualizar gasto

### Purpose

Actualizar un gasto existente, recalcular balances afectados y dejar auditoría.

### HTTP method and path

`PATCH /api/expenses/[id]`

### Request parameters

Route param:

- `id`: identificador del gasto

### Request body

```json
{
  "actorUserId": "usr_admin_1",
  "actorRole": "ADMIN",
  "amount": 95,
  "category": "FUEL",
  "description": "Adjusted fuel charge",
  "expenseDate": "2026-03-08T00:00:00.000Z",
  "year": 2026,
  "month": 3,
  "currency": "USD"
}
```

### Success response example

```json
{
  "expense": {
    "id": "exp_123",
    "collaboratorId": "clb_123",
    "amount": 95,
    "category": "FUEL",
    "description": "Adjusted fuel charge",
    "expenseDate": "2026-03-08T00:00:00.000Z",
    "year": 2026,
    "month": 3,
    "currency": "USD",
    "status": "ACTIVE",
    "registeredByUserId": "usr_123",
    "updatedByUserId": "usr_admin_1",
    "createdAt": "2026-03-08T14:00:00.000Z",
    "updatedAt": "2026-03-08T16:00:00.000Z"
  },
  "recalculation": {
    "collaboratorId": "clb_123",
    "months": [
      {
        "year": 2026,
        "month": 3,
        "openingBalance": 300,
        "quotaAmount": 300,
        "executedAmount": 140,
        "closingBalance": 160,
        "balanceId": "bal_123"
      }
    ]
  }
}
```

### Error response examples

```json
{
  "error": "EXPENSE_NOT_EDITABLE",
  "message": "Voided expenses cannot be updated."
}
```

```json
{
  "error": "INVALID_BALANCE_OUTCOME",
  "message": "The expense update produces an invalid negative balance in the recalculation chain."
}
```

### Notes about business behavior

- Solo `ADMIN` puede actualizar.
- No permite actualizar gastos `VOIDED`.
- Recalcula desde el período más temprano afectado.

---

## 4. Anular gasto

### Purpose

Anular lógicamente un gasto sin eliminarlo físicamente.

### HTTP method and path

`POST /api/expenses/[id]/void`

### Request parameters

Route param:

- `id`: identificador del gasto

### Request body

```json
{
  "actorUserId": "usr_admin_1",
  "actorRole": "ADMIN",
  "reason": "Duplicate expense record"
}
```

### Success response example

```json
{
  "expense": {
    "id": "exp_123",
    "collaboratorId": "clb_123",
    "amount": 80,
    "category": "FUEL",
    "description": "Fuel refill",
    "expenseDate": "2026-03-05T14:00:00.000Z",
    "year": 2026,
    "month": 3,
    "currency": "USD",
    "status": "VOIDED",
    "registeredByUserId": "usr_123",
    "updatedByUserId": "usr_admin_1",
    "voidedByUserId": "usr_admin_1",
    "voidedAt": "2026-03-08T16:10:00.000Z",
    "createdAt": "2026-03-05T14:00:00.000Z",
    "updatedAt": "2026-03-08T16:10:00.000Z"
  },
  "recalculation": {
    "collaboratorId": "clb_123",
    "months": [
      {
        "year": 2026,
        "month": 3,
        "openingBalance": 300,
        "quotaAmount": 300,
        "executedAmount": 45,
        "closingBalance": 255,
        "balanceId": "bal_123"
      }
    ]
  }
}
```

### Error response examples

```json
{
  "error": "EXPENSE_ALREADY_VOIDED",
  "message": "Expense is already voided."
}
```

```json
{
  "error": "UNAUTHORIZED_ROLE",
  "message": "Only an administrator can void an expense."
}
```

### Notes about business behavior

- No elimina físicamente el gasto.
- Cambia estado a `VOIDED`.
- Guarda `voidedByUserId` y `voidedAt`.
- Recalcula balances desde el mes del gasto.

---

## 5. Asignar o actualizar cupo mensual

### Purpose

Crear o actualizar el cupo mensual de un colaborador.

### HTTP method and path

`POST /api/quotas`

### Request parameters

No usa query params.

### Request body

```json
{
  "collaboratorId": "clb_123",
  "year": 2026,
  "month": 3,
  "amount": 300,
  "currency": "USD",
  "actorUserId": "usr_admin_1",
  "actorRole": "ADMIN"
}
```

### Success response example

```json
{
  "quota": {
    "id": "quota_123",
    "collaboratorId": "clb_123",
    "year": 2026,
    "month": 3,
    "amount": 300,
    "currency": "USD",
    "assignedByUserId": "usr_admin_1",
    "updatedByUserId": null,
    "status": "ACTIVE",
    "createdAt": "2026-03-08T15:00:00.000Z",
    "updatedAt": "2026-03-08T15:00:00.000Z"
  },
  "recalculation": {
    "collaboratorId": "clb_123",
    "months": [
      {
        "year": 2026,
        "month": 3,
        "openingBalance": 300,
        "quotaAmount": 300,
        "executedAmount": 125,
        "closingBalance": 175,
        "balanceId": "bal_123"
      }
    ]
  }
}
```

### Error response examples

```json
{
  "error": "COLLABORATOR_NOT_FOUND",
  "message": "Collaborator does not exist."
}
```

```json
{
  "error": "INVALID_PERIOD",
  "message": "Year and month must define a valid period."
}
```

### Notes about business behavior

- Si ya existe cupo para el mes, lo actualiza.
- Si no existe, lo crea.
- Recalcula balances desde ese período.

---

## 6. Obtener balance de colaborador por id interno

### Purpose

Consultar el balance mensual persistido de un colaborador por su id interno.

### HTTP method and path

`GET /api/collaborators/[id]/balance`

### Request parameters

Route param:

- `id`: identificador interno del colaborador

Query params opcionales:

- `year`
- `month`

### Request body if applicable

No aplica.

### Success response example

```json
{
  "collaborator": {
    "id": "clb_123",
    "employeeId": "EMP-1001",
    "fullName": "Carlos Mendoza",
    "status": "ACTIVE"
  },
  "period": {
    "year": 2026,
    "month": 3
  },
  "balance": {
    "openingBalance": 300,
    "quotaAmount": 300,
    "executedAmount": 125,
    "closingBalance": 175,
    "currency": "USD",
    "lastExpenseDate": "2026-03-12T10:30:00.000Z",
    "recalculatedAt": "2026-03-08T15:00:00.000Z"
  }
}
```

### Error response examples

```json
{
  "error": "COLLABORATOR_NOT_FOUND",
  "message": "Collaborator does not exist."
}
```

```json
{
  "error": "MONTHLY_BALANCE_NOT_FOUND",
  "message": "Monthly balance does not exist for the requested period."
}
```

### Notes about business behavior

- Si no se envía `year` y `month`, usa el período UTC actual.
- Lee el balance persistido, no recalcula en la ruta.

---

## 7. Obtener ledger mensual del colaborador

### Purpose

Consultar una vista mensual consolidada con colaborador, cupo, balance y gastos del período.

### HTTP method and path

`GET /api/collaborators/[id]/ledger`

### Request parameters

Route param:

- `id`: identificador interno del colaborador

Query params opcionales:

- `year`
- `month`

### Request body if applicable

No aplica.

### Success response example

```json
{
  "collaborator": {
    "id": "clb_123",
    "employeeId": "EMP-1001",
    "fullName": "Carlos Mendoza",
    "status": "ACTIVE"
  },
  "period": {
    "year": 2026,
    "month": 3
  },
  "quota": {
    "amount": 300,
    "currency": "USD",
    "status": "ACTIVE"
  },
  "balance": {
    "openingBalance": 300,
    "quotaAmount": 300,
    "executedAmount": 125,
    "closingBalance": 175,
    "currency": "USD",
    "lastExpenseDate": "2026-03-12T10:30:00.000Z",
    "recalculatedAt": "2026-03-08T15:00:00.000Z"
  },
  "expenses": [
    {
      "id": "exp_1",
      "expenseDate": "2026-03-05T14:00:00.000Z",
      "year": 2026,
      "month": 3,
      "category": "FUEL",
      "amount": 80,
      "currency": "USD",
      "description": "Carga de combustible semanal",
      "status": "ACTIVE"
    }
  ]
}
```

### Error response examples

```json
{
  "error": "INVALID_PERIOD",
  "message": "year and month query params must define a valid period."
}
```

```json
{
  "error": "LEDGER_NOT_FOUND",
  "message": "No quota, balance, or expenses exist for the requested period."
}
```

### Notes about business behavior

- Si cuota, balance y gastos están todos ausentes, responde `404`.
- Los gastos se devuelven en orden ascendente por `expenseDate`.

---

## 8. Consulta de balance para aprobadores por employeeId

### Purpose

Permitir a un aprobador consultar el balance de un colaborador usando `employeeId`.

### HTTP method and path

`GET /api/approvals/balance`

### Request parameters

Query params:

- `employeeId` requerido
- `year` opcional
- `month` opcional

### Request body if applicable

No aplica.

### Success response example

```json
{
  "collaborator": {
    "id": "clb_123",
    "employeeId": "EMP-1001",
    "fullName": "Carlos Mendoza",
    "status": "ACTIVE"
  },
  "period": {
    "year": 2026,
    "month": 3
  },
  "balance": {
    "openingBalance": 300,
    "quotaAmount": 300,
    "executedAmount": 125,
    "closingBalance": 175,
    "currency": "USD",
    "lastExpenseDate": "2026-03-12T10:30:00.000Z",
    "recalculatedAt": "2026-03-08T15:00:00.000Z"
  }
}
```

### Error response examples

```json
{
  "error": "INVALID_EMPLOYEE_ID",
  "message": "employeeId query param is required."
}
```

```json
{
  "error": "MONTHLY_BALANCE_NOT_FOUND",
  "message": "Monthly balance does not exist for the requested period."
}
```

### Notes about business behavior

- Usa `employeeId`, no el id interno del colaborador.
- Si no se envía período, usa año y mes UTC actuales.

---

## 9. Listar colaboradores

### Purpose

Obtener un listado paginado de colaboradores para uso administrativo.

### HTTP method and path

`GET /api/collaborators`

### Request parameters

Query params opcionales:

- `search`
- `status`
- `page`
- `pageSize`

### Request body if applicable

No aplica.

### Success response example

```json
{
  "items": [
    {
      "id": "clb_123",
      "employeeId": "EMP-1001",
      "fullName": "Carlos Mendoza",
      "status": "ACTIVE",
      "costCenter": "OPERACIONES",
      "department": "Logistica",
      "vehicleReference": "CAMION-12"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 2
  }
}
```

### Error response examples

```json
{
  "error": "INVALID_STATUS",
  "message": "status must be ACTIVE or INACTIVE."
}
```

```json
{
  "error": "INVALID_PAGINATION",
  "message": "page and pageSize must be valid positive integers, and pageSize must not exceed 100."
}
```

### Notes about business behavior

- `search` busca por `employeeId` y `fullName`.
- `page` default es `1`.
- `pageSize` default es `20`.
- `pageSize` máximo es `100`.

---

## 10. Crear colaborador

### Purpose

Crear un nuevo colaborador.

### HTTP method and path

`POST /api/collaborators`

### Request parameters

No usa query params.

### Request body

```json
{
  "employeeId": "EMP-1003",
  "fullName": "Luis Herrera",
  "documentNumber": "0934567890",
  "costCenter": "OPERACIONES",
  "department": "Logistica",
  "vehicleReference": "CAMION-22",
  "status": "ACTIVE"
}
```

### Success response example

```json
{
  "collaborator": {
    "id": "clb_456",
    "employeeId": "EMP-1003",
    "fullName": "Luis Herrera",
    "status": "ACTIVE",
    "costCenter": "OPERACIONES",
    "department": "Logistica",
    "vehicleReference": "CAMION-22",
    "documentNumber": "0934567890"
  }
}
```

### Error response examples

```json
{
  "error": "INVALID_REQUEST_BODY",
  "message": "Request body is invalid."
}
```

```json
{
  "error": "DUPLICATE_EMPLOYEE_ID",
  "message": "A collaborator with that employeeId already exists."
}
```

### Notes about business behavior

- `employeeId` es obligatorio.
- `fullName` es obligatorio.
- `status` default es `ACTIVE` si se omite.
- Rechaza `employeeId` duplicado con `409`.
