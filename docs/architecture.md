# Arquitectura base

## 1. Principios

- Next.js con App Router para UI, layouts, navegacion y API Routes.
- Separacion explicita entre presentacion, aplicacion, dominio e infraestructura.
- Reglas de negocio aisladas de Next.js y de la base de datos.
- Soporte desde el inicio para roles: `administrador`, `colaborador`, `aprobador`.
- Trazabilidad obligatoria para operaciones sensibles.

## 2. Capas

### `src/app`

Capa de presentacion y transporte HTTP.

- paginas, layouts y componentes server/client
- route handlers en `app/api`
- middleware visual y composicion de interfaces

### `src/domain`

Nucleo del negocio.

- entidades del dominio
- objetos de valor
- contratos de repositorio
- servicios de dominio para reglas puras

No debe depender de Next.js ni del motor de base de datos.

### `src/application`

Casos de uso del sistema.

- orquesta entidades, repositorios y politicas
- valida permisos de alto nivel
- define DTOs de entrada y salida

Aqui viven operaciones como:

- registrar colaborador
- asignar cupo mensual
- registrar gasto
- recalcular saldo del mes
- consultar saldo por colaborador
- emitir trazas de auditoria

### `src/infrastructure`

Implementaciones tecnicas.

- cliente de base de datos
- repositorios concretos
- autenticacion/autorizacion integrada
- auditoria persistente
- variables de entorno y configuracion

### `src/modules`

Organizacion funcional transversal por dominio de negocio.

Cada modulo agrupa referencias, mapeos, schemas y componentes cercanos a una capacidad concreta sin romper la separacion por capas.

## 3. Entidades principales del dominio

### `User`

Representa al usuario autenticado del sistema.

Campos base sugeridos:

- `id`
- `email`
- `nombre`
- `estado`
- `rol`
- `createdAt`
- `updatedAt`

### `CollaboratorProfile`

Datos del colaborador consultable por ID corporativo.

Campos base sugeridos:

- `id`
- `employeeId`
- `userId`
- `centroCosto`
- `vehiculoAsignado`
- `estado`

### `MonthlyQuota`

Cupo asignado por periodo.

Campos base sugeridos:

- `id`
- `collaboratorId`
- `year`
- `month`
- `amount`
- `assignedBy`
- `assignedAt`

### `Expense`

Gasto ejecutado por combustible o mantenimiento.

Campos base sugeridos:

- `id`
- `collaboratorId`
- `year`
- `month`
- `category`
- `amount`
- `description`
- `registeredBy`
- `registeredAt`
- `source`

### `MonthlyBalance`

Estado consolidado por mes.

Formula base:

`saldoInicial = saldoFinalMesAnterior + cupoMesActual`

`saldoFinal = saldoInicial - totalGastosMes`

Campos base sugeridos:

- `id`
- `collaboratorId`
- `year`
- `month`
- `openingBalance`
- `quotaAmount`
- `executedAmount`
- `closingBalance`
- `lastCalculatedAt`

### `AuditLog`

Registro de trazabilidad.

Campos base sugeridos:

- `id`
- `actorUserId`
- `actorRole`
- `action`
- `entityType`
- `entityId`
- `before`
- `after`
- `metadata`
- `createdAt`

## 4. Carpetas y proposito

### `src/app/(auth)`

Pantallas de acceso, validacion de sesion y flujo inicial.

### `src/app/(dashboard)/admin`

Interfaz para alta de colaboradores, asignacion de cupos, carga de gastos y revision operativa.

### `src/app/(dashboard)/colaborador`

Interfaz del colaborador para registrar gastos y consultar su historial.

### `src/app/(dashboard)/aprobador`

Interfaz ligera para consulta de saldo por ID de colaborador.

### `src/app/api`

Endpoints internos para operaciones del sistema. Deben llamar a casos de uso, no acceder directo a SQL.

### `src/app/_components`

Componentes de presentacion compartidos por rutas App Router.

### `src/domain/entities`

Entidades centrales del negocio.

### `src/domain/value-objects`

Tipos con reglas de consistencia como `Money`, `Period`, `EmployeeId`.

### `src/domain/services`

Reglas puras del dominio, por ejemplo calculo de saldo mensual.

### `src/domain/repositories`

Interfaces que define el dominio para leer o persistir informacion.

### `src/application/use-cases`

Casos de uso ejecutables por la UI o la API.

### `src/application/dto`

Contratos de entrada y salida entre transporte y negocio.

### `src/application/policies`

Reglas de autorizacion por rol y permisos de operacion.

### `src/infrastructure/db`

Conexion, migraciones, seeds y modelos del motor de datos elegido.

### `src/infrastructure/repositories`

Implementaciones concretas de los contratos del dominio.

### `src/infrastructure/auth`

Adaptadores para sesion, proveedores de identidad y resolucion del usuario actual.

### `src/infrastructure/audit`

Persistencia y publicacion de eventos de auditoria.

### `src/infrastructure/config`

Carga tipada de variables de entorno y flags.

### `src/modules/*`

Agrupacion funcional para evolucionar sin perder contexto de negocio.

### `src/shared`

Elementos reutilizables transversales: UI, utilidades, constantes, validadores y tipos.

## 5. Roles

### Administrador

- crea y edita colaboradores
- asigna cupos mensuales
- registra gastos
- consulta historial y saldos
- corrige datos bajo trazabilidad

### Colaborador

- consulta su propio saldo
- registra gastos propios segun politica
- visualiza historial mensual

### Aprobador

- consulta saldo actual por `employeeId`
- visualiza estado consolidado para validacion operativa

## 6. Auditoria y trazabilidad

Registrar al menos:

- altas, bajas logicas y cambios de colaboradores
- asignaciones y ajustes de cupo
- registro, edicion y anulacion de gastos
- recalculos de saldo
- consultas sensibles de saldo por terceros, si la politica interna lo exige

Recomendacion tecnica:

- usar `AuditLog` como almacenamiento persistente
- emitir eventos desde los casos de uso
- guardar `before` y `after` serializados cuando aplique
- registrar actor, fecha, IP interna o identificador de sesion, y motivo del cambio cuando sea un ajuste manual

## 7. Archivos iniciales sugeridos

- `README.md`
- `docs/architecture.md`
- `docs/deployment-interno.md`
- `docs/roadmap.md`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/middleware.ts`
- `src/domain/entities/*.ts`
- `src/domain/services/calculate-monthly-balance.ts`
- `src/application/use-cases/*.ts`
- `src/infrastructure/db/*`
- `src/infrastructure/config/env.ts`
- `src/shared/constants/roles.ts`

## 8. Recomendacion de persistencia

Para una app corporativa interna, conviene iniciar con una base relacional.

Opcion sugerida:

- PostgreSQL
- ORM: Prisma o Drizzle

Motivo:

- relaciones claras entre colaborador, cupo, gasto y saldo mensual
- facilidad para auditoria y consultas historicas
- soporte consistente para ambientes internos
