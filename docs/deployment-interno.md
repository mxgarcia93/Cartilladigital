# Despliegue interno minimo

## Objetivo

Dejar definida la informacion minima que el equipo de Produccion necesitara para publicar la aplicacion en la red interna.

## Requisitos de infraestructura

- Node.js LTS
- gestor de paquetes estandarizado (`pnpm` o `npm`)
- base de datos corporativa accesible desde la red interna
- variables de entorno administradas por Produccion
- DNS interno o URL interna definida
- mecanismo de autenticacion corporativa o credenciales locales controladas

## Variables de entorno a documentar

- `NODE_ENV`
- `PORT`
- `APP_URL`
- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_PROVIDER_*` si se integra SSO corporativo
- `AUDIT_RETENTION_DAYS`

## Entregables que Produccion debe recibir

- archivo `README.md` con instrucciones de arranque
- matriz de variables de entorno por ambiente
- instrucciones de migracion de base de datos
- estrategia de backup y retencion de auditoria
- puertos requeridos
- origenes permitidos y restricciones de red
- usuario tecnico o credenciales de despliegue

## Consideraciones operativas

- habilitar logs de aplicacion y auditoria por separado
- definir rotacion de logs
- monitorear disponibilidad de la base de datos
- documentar reinicio del servicio
- definir responsable funcional y responsable tecnico

## Ambientes sugeridos

- `dev`
- `qa`
- `prod-interno`

## Seguridad minima

- HTTPS interno si la infraestructura lo permite
- control de acceso por roles desde backend, no solo frontend
- enmascarado de datos sensibles en logs
- respaldo de auditoria no editable por usuarios finales
