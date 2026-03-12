# Cartilla Digital

Base arquitectonica para una aplicacion interna en Next.js (App Router) orientada al control de gastos y presupuesto de combustible y mantenimiento vehicular.

## Objetivo funcional

- Un administrador registra colaboradores y les asigna un cupo mensual.
- Cada mes se registran consumos o gastos ejecutados.
- El gasto descuenta el saldo disponible del mes.
- El saldo se acumula al siguiente mes.
- Un aprobador puede consultar el saldo actual de un colaborador por ID.
- El sistema debe mantener trazabilidad y auditoria de cambios.

## Alcance de esta fase

Esta carpeta contiene solo el esqueleto base del proyecto:

- estructura de carpetas escalable para Next.js App Router
- separacion entre frontend, dominio, logica de negocio, infraestructura y API
- documentacion inicial de arquitectura y despliegue interno
- archivos placeholder para guiar la implementacion posterior

No incluye aun la implementacion funcional completa.

## Estructura propuesta

```text
Cartilla digital/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── deployment-interno.md
│   └── roadmap.md
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   ├── colaborador/
│   │   │   └── aprobador/
│   │   ├── api/
│   │   └── _components/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── services/
│   │   └── repositories/
│   ├── application/
│   │   ├── use-cases/
│   │   ├── dto/
│   │   └── policies/
│   ├── infrastructure/
│   │   ├── db/
│   │   ├── repositories/
│   │   ├── auth/
│   │   ├── audit/
│   │   └── config/
│   ├── modules/
│   │   ├── colaboradores/
│   │   ├── cupos/
│   │   ├── gastos/
│   │   ├── saldos/
│   │   ├── aprobaciones/
│   │   └── auditoria/
│   └── shared/
│       ├── ui/
│       ├── lib/
│       ├── validators/
│       ├── types/
│       └── constants/
└── .gitkeep
```

## Documentacion clave

- [Arquitectura](./docs/architecture.md)
- [Despliegue interno](./docs/deployment-interno.md)
- [Orden de desarrollo](./docs/roadmap.md)

## Variables de entorno para autenticacion

Para autenticacion local con `next-auth`, define al menos:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Valores de desarrollo actuales:

```env
DATABASE_URL="postgresql://postgres:9256@localhost:5432/cartilla_digital"
NEXTAUTH_SECRET="cartilla-nextauth-dev-secret"
NEXTAUTH_URL="http://localhost:3000"
```
