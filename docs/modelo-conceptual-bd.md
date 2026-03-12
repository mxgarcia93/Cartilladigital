# Modelo Conceptual de Base de Datos

## Sistema: Cartilla Digital

## Propósito

Este documento define el modelo conceptual de datos para **Cartilla Digital**, alineado con las reglas funcionales del proyecto y con las decisiones validadas:

- `User` y `Collaborator` son entidades separadas
- `MonthlyBalance` es una tabla persistente
- `Expense` solo puede ser editado por un administrador
- `MonthlyQuota` debe estar separada de `MonthlyBalance`

Este documento sirve como base para la validación funcional, el diseño lógico y la implementación posterior en ORM o SQL.

---

## 1. Entidades principales

Las entidades principales del dominio son:

- `User`
- `Role`
- `Collaborator`
- `MonthlyQuota`
- `Expense`
- `MonthlyBalance`
- `AuditLog`

Opcionalmente, en una fase posterior, pueden agregarse entidades complementarias como `Vehicle`, `CostCenter` o `Attachment`, pero no son necesarias para el núcleo inicial.

---

## 2. Descripción de cada entidad

### `User`

Representa una cuenta de acceso al sistema.

Es una entidad de seguridad y operación. Define quién inicia sesión y qué rol tiene dentro de la aplicación.

No representa directamente al colaborador presupuestado, ya que un usuario puede ser:

- administrador
- aprobador
- colaborador

En el caso del colaborador, puede existir una relación con la entidad `Collaborator`.

### `Role`

Representa el rol funcional del usuario dentro del sistema.

Se recomienda manejarlo como catálogo o enum controlado. Su propósito es permitir autorización y trazabilidad consistente.

### `Collaborator`

Representa a la persona que posee un presupuesto mensual y sobre la cual se registran cupos, gastos y saldos.

Es independiente de `User` para soportar escenarios como:

- colaboradores sin acceso directo al sistema
- consulta operativa por ID corporativo
- continuidad histórica aunque cambie la cuenta de acceso

### `MonthlyQuota`

Representa el cupo mensual asignado a un colaborador para un período específico.

Debe existir separada del balance para conservar el dato original asignado y soportar auditoría, ajustes y recalculación.

### `Expense`

Representa un gasto ejecutado por el colaborador en una fecha determinada.

Puede ser registrado por el propio colaborador o por un administrador, pero solo puede ser modificado o eliminado por un administrador.

### `MonthlyBalance`

Representa el estado consolidado mensual persistido del colaborador.

Esta entidad almacena el resultado del cálculo del saldo del mes y permite:

- consultas rápidas
- trazabilidad histórica
- recalculación controlada
- propagación de cambios a meses posteriores

### `AuditLog`

Representa el registro de auditoría de acciones realizadas sobre entidades críticas del sistema.

Debe guardar quién hizo el cambio, cuándo lo hizo, qué entidad fue afectada y cuál fue el valor anterior y el nuevo valor.

---

## 3. Campos principales por entidad

### `User`

Campos sugeridos:

- `id`
- `email`
- `username`
- `fullName`
- `role`
- `status`
- `passwordHash` o referencia al proveedor de identidad
- `lastLoginAt`
- `createdAt`
- `updatedAt`

Notas:

- `email` puede ser nulo si la autenticación es completamente interna basada en usuario corporativo.
- `role` puede vivir como enum o como FK a catálogo `Role`, según el nivel de flexibilidad requerido.

### `Role`

Campos sugeridos:

- `id`
- `code`
- `name`
- `description`
- `createdAt`

Valores funcionales esperados:

- `ADMIN`
- `COLLABORATOR`
- `APPROVER`

### `Collaborator`

Campos sugeridos:

- `id`
- `employeeId`
- `documentNumber` opcional
- `fullName`
- `costCenter`
- `department`
- `vehicleReference` opcional
- `userId` opcional
- `status`
- `createdAt`
- `updatedAt`

Notas:

- `employeeId` es el identificador corporativo consultado por aprobadores.
- `userId` debe ser opcional para no forzar que todo colaborador tenga acceso al sistema.

### `MonthlyQuota`

Campos sugeridos:

- `id`
- `collaboratorId`
- `year`
- `month`
- `amount`
- `currency`
- `assignedByUserId`
- `assignedAt`
- `updatedByUserId`
- `updatedAt`
- `status`

Notas:

- Debe existir un único cupo por colaborador, mes y año.
- Los cambios de cupo deben disparar recalculación del balance del mes y de meses posteriores si aplica.

### `Expense`

Campos sugeridos:

- `id`
- `collaboratorId`
- `expenseDate`
- `year`
- `month`
- `category`
- `amount`
- `currency`
- `description`
- `registeredByUserId`
- `createdAt`
- `updatedAt`
- `updatedByUserId`
- `status`

Notas:

- `year` y `month` pueden derivarse de `expenseDate`, pero conviene persistirlos para facilitar filtros e índices.
- `status` permite manejo de borrado lógico o anulación sin perder historial.

### `MonthlyBalance`

Campos sugeridos:

- `id`
- `collaboratorId`
- `year`
- `month`
- `openingBalance`
- `quotaAmount`
- `executedAmount`
- `closingBalance`
- `currency`
- `lastExpenseDate` opcional
- `calculationVersion`
- `recalculatedAt`
- `createdAt`
- `updatedAt`

Notas:

- `openingBalance` = saldo final del mes anterior + cupo del mes actual
- `closingBalance` = `openingBalance - executedAmount`
- `quotaAmount` debe reflejar el valor vigente del cupo usado en el cálculo
- `executedAmount` es la suma de gastos válidos del período

### `AuditLog`

Campos sugeridos:

- `id`
- `actorUserId`
- `actorRole`
- `action`
- `entityType`
- `entityId`
- `reason` opcional
- `beforeValue`
- `afterValue`
- `metadata`
- `createdAt`

Notas:

- `beforeValue` y `afterValue` pueden almacenarse como JSON
- `metadata` puede incluir IP interna, sesión, origen y observaciones

---

## 4. Relaciones entre entidades

### `Role` -> `User`

- Un `Role` puede estar asociado a muchos `User`
- Un `User` pertenece a un solo `Role`

### `User` -> `Collaborator`

- Un `User` puede estar vinculado a cero o un `Collaborator`
- Un `Collaborator` puede estar vinculado a cero o un `User`

Esta relación debe ser opcional en ambos lados a nivel funcional.

### `Collaborator` -> `MonthlyQuota`

- Un `Collaborator` puede tener muchos `MonthlyQuota`
- Un `MonthlyQuota` pertenece a un solo `Collaborator`

### `Collaborator` -> `Expense`

- Un `Collaborator` puede tener muchos `Expense`
- Un `Expense` pertenece a un solo `Collaborator`

### `Collaborator` -> `MonthlyBalance`

- Un `Collaborator` puede tener muchos `MonthlyBalance`
- Un `MonthlyBalance` pertenece a un solo `Collaborator`

### `User` -> `MonthlyQuota`

- Un `User` puede asignar muchos `MonthlyQuota`
- Un `MonthlyQuota` es asignado por un solo `User`

### `User` -> `Expense`

- Un `User` puede registrar muchos `Expense`
- Un `Expense` es registrado por un solo `User`

### `User` -> `AuditLog`

- Un `User` puede generar muchos `AuditLog`
- Un `AuditLog` tiene un solo `actorUserId`

---

## 5. Cardinalidades

Resumen de cardinalidades principales:

- `Role 1 -> N User`
- `User 0..1 <-> 0..1 Collaborator`
- `Collaborator 1 -> N MonthlyQuota`
- `Collaborator 1 -> N Expense`
- `Collaborator 1 -> N MonthlyBalance`
- `User 1 -> N MonthlyQuota` como asignador
- `User 1 -> N Expense` como registrador
- `User 1 -> N AuditLog`

Regla temporal relevante:

- `Collaborator 1 -> 0..1 MonthlyQuota` por combinación `(year, month)`
- `Collaborator 1 -> 0..1 MonthlyBalance` por combinación `(year, month)`

---

## 6. Enums necesarios

### `RoleCode`

Valores:

- `ADMIN`
- `COLLABORATOR`
- `APPROVER`

### `UserStatus`

Valores sugeridos:

- `ACTIVE`
- `INACTIVE`
- `LOCKED`

### `CollaboratorStatus`

Valores sugeridos:

- `ACTIVE`
- `INACTIVE`

### `ExpenseCategory`

Valores:

- `FUEL`
- `MAINTENANCE`

### `ExpenseStatus`

Valores sugeridos:

- `ACTIVE`
- `VOIDED`

### `QuotaStatus`

Valores sugeridos:

- `ACTIVE`
- `ADJUSTED`
- `CANCELLED`

### `AuditAction`

Valores sugeridos:

- `CREATE`
- `UPDATE`
- `DELETE`
- `ASSIGN_QUOTA`
- `REGISTER_EXPENSE`
- `UPDATE_EXPENSE`
- `DELETE_EXPENSE`
- `RECALCULATE_BALANCE`
- `QUERY_BALANCE`

### `EntityType`

Valores sugeridos:

- `USER`
- `COLLABORATOR`
- `MONTHLY_QUOTA`
- `EXPENSE`
- `MONTHLY_BALANCE`

---

## 7. Restricciones únicas

Las siguientes restricciones únicas son importantes para preservar la consistencia funcional:

### `User`

- único en `email` si el correo se usa como credencial
- único en `username` si se usa autenticación por usuario interno

### `Role`

- único en `code`

### `Collaborator`

- único en `employeeId`
- único en `userId` cuando exista vínculo con cuenta de acceso

### `MonthlyQuota`

- único compuesto en `(collaboratorId, year, month)`

Esto garantiza un único cupo mensual por colaborador.

### `MonthlyBalance`

- único compuesto en `(collaboratorId, year, month)`

Esto garantiza un único balance persistido por período y colaborador.

No se recomienda unicidad equivalente en `Expense`, porque un colaborador puede registrar múltiples gastos en un mismo mes y fecha.

---

## 8. Índices importantes

### `User`

Índices sugeridos:

- índice por `role`
- índice por `status`

### `Collaborator`

Índices sugeridos:

- índice único por `employeeId`
- índice por `status`
- índice por `costCenter`

### `MonthlyQuota`

Índices sugeridos:

- índice único `(collaboratorId, year, month)`
- índice por `(year, month)`
- índice por `assignedByUserId`

### `Expense`

Índices sugeridos:

- índice por `collaboratorId`
- índice compuesto por `(collaboratorId, year, month)`
- índice por `expenseDate`
- índice por `category`
- índice por `registeredByUserId`
- índice por `status`

### `MonthlyBalance`

Índices sugeridos:

- índice único `(collaboratorId, year, month)`
- índice por `(year, month)`
- índice por `closingBalance`
- índice por `recalculatedAt`

### `AuditLog`

Índices sugeridos:

- índice por `actorUserId`
- índice por `entityType`
- índice compuesto por `(entityType, entityId)`
- índice por `createdAt`
- índice por `action`

---

## 9. Notas sobre auditabilidad

La auditoría es obligatoria para operaciones críticas.

Deben auditarse al menos:

- creación de colaborador
- actualización de colaborador
- asignación o modificación de cupo
- registro de gasto
- modificación de gasto
- eliminación o anulación de gasto
- recalculación de balance

Cada evento debe registrar:

- usuario actor
- rol del actor
- acción
- entidad afectada
- identificador de la entidad
- fecha y hora
- valor anterior
- valor nuevo
- razón del cambio cuando exista corrección manual

Recomendación conceptual:

- usar borrado lógico o anulación para `Expense` en lugar de borrado físico
- registrar las correcciones como eventos auditables explícitos
- nunca sobrescribir silenciosamente valores críticos sin dejar rastro

---

## 10. Notas sobre recalculación de balances

`MonthlyBalance` debe persistirse y no calcularse únicamente en tiempo real.

Motivos:

- mejora el rendimiento de consulta
- conserva evidencia histórica del cálculo aplicado
- facilita auditoría
- simplifica la consulta por aprobadores

### Regla de cálculo

- `openingBalance = previousMonth.closingBalance + currentMonth.quotaAmount`
- `closingBalance = openingBalance - executedAmount`

### Regla del primer mes

Si no existe mes anterior para el colaborador:

- `openingBalance = quotaAmount`

### Eventos que deben disparar recalculación

- creación de un `MonthlyQuota`
- actualización de un `MonthlyQuota`
- creación de un `Expense`
- actualización de un `Expense`
- anulación o eliminación lógica de un `Expense`

### Alcance mínimo de recalculación

Cuando cambia información de un mes:

- recalcular el `MonthlyBalance` del mes afectado
- recalcular todos los meses posteriores del mismo colaborador en orden cronológico

### Regla de integridad

No se debe permitir persistir un `MonthlyBalance` con:

- `closingBalance < 0`

Y no se debe permitir registrar un `Expense` si:

- `amount > availableBalance` del colaborador para el período correspondiente

---

## 11. Observaciones de validación funcional

Este modelo conceptual refleja las reglas del documento de negocio y especialmente:

- un único cupo mensual por colaborador
- acumulación automática de saldo entre meses
- prohibición de saldo negativo
- separación entre identidad de acceso (`User`) y sujeto presupuestario (`Collaborator`)
- persistencia separada de `MonthlyQuota` y `MonthlyBalance`
- edición de gastos restringida a administradores

Antes del diseño lógico se recomienda validar adicionalmente:

- si un colaborador siempre tendrá usuario de acceso o no
- si el sistema manejará una sola moneda fija o si la moneda debe persistirse por registro
- si la eliminación de gastos será anulación lógica obligatoria
- si las consultas de aprobadores también deben quedar auditadas
