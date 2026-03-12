# Orden recomendado de desarrollo

## Fase 1. Fundacion tecnica

- crear proyecto Next.js con App Router y TypeScript
- configurar linting, formateo y manejo de entornos
- definir estructura `src/`
- elegir ORM y base de datos

## Fase 2. Dominio y datos

- modelar entidades
- definir contratos de repositorio
- implementar esquema relacional
- preparar migraciones iniciales

## Fase 3. Casos de uso base

- registrar colaborador
- asignar cupo mensual
- registrar gasto
- recalcular saldo mensual
- consultar saldo por ID

## Fase 4. Seguridad y roles

- autenticacion
- autorizacion por rol
- proteccion de rutas y endpoints

## Fase 5. UI operativa

- dashboard administrador
- vista colaborador
- pantalla aprobador

## Fase 6. Auditoria y observabilidad

- persistencia de auditoria
- logs estructurados
- seguimiento de eventos criticos

## Fase 7. Validacion operativa

- pruebas unitarias de reglas de saldo
- pruebas de integracion de casos de uso
- pruebas de roles y permisos
- smoke test de despliegue interno
