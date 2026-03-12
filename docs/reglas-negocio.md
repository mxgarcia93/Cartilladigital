# Reglas de Negocio

## Sistema: Cartilla Digital

### Versión

1.0

### Propósito

Este documento define las reglas de negocio del sistema **Cartilla Digital**, una aplicación interna para la gestión y control del presupuesto de combustible y mantenimiento vehicular asignado a colaboradores.

El documento sirve como referencia para:

* desarrollo del sistema
* validación funcional
* modelado de base de datos
* pruebas
* despliegue en red interna

---

# 1. Objetivo del sistema

Cartilla Digital es una aplicación interna que permite administrar un **presupuesto mensual asignado a colaboradores** para gastos relacionados con:

* combustible
* mantenimiento vehicular

El sistema permite:

* asignar cupos mensuales
* registrar gastos
* calcular saldo disponible
* acumular saldo entre meses
* consultar saldo actual por colaborador

---

# 2. Roles del sistema

## Administrador

Usuario con permisos completos.

Puede:

* registrar colaboradores
* modificar información de colaboradores
* asignar cupos mensuales
* registrar gastos
* corregir registros
* consultar saldos
* consultar historial
* visualizar reportes

---

## Colaborador

Usuario con presupuesto asignado.

Puede:

* consultar su saldo actual
* consultar su historial de gastos
* registrar gastos asociados a su cupo

No puede:

* modificar cupos
* consultar otros colaboradores

---

## Aprobador

Usuario con permisos de consulta.

Puede:

* consultar saldo actual de un colaborador ingresando su ID

No puede:

* modificar información
* registrar gastos
* modificar cupos

---

# 3. Definiciones clave

## Cupo mensual

Monto asignado a un colaborador para un mes específico.

Ejemplo:

| colaborador | mes   | cupo |
| ----------- | ----- | ---- |
| 123         | enero | $200 |

---

## Gasto

Registro de consumo realizado por el colaborador.

Categorías válidas:

* combustible
* mantenimiento

Ejemplo:

| colaborador | mes   | tipo        | monto |
| ----------- | ----- | ----------- | ----- |
| 123         | enero | combustible | $80   |

---

## Saldo inicial del mes

Monto disponible al inicio del mes.

saldo inicial mes actual = saldo final mes anterior + cupo mes actual

---

## Saldo final del mes

Monto disponible luego de descontar gastos.

saldo final = saldo inicial - gastos del mes

---

## Saldo acumulado

El saldo restante de un mes se transfiere automáticamente al siguiente mes.

Ejemplo:

| mes   | cupo | gastos | saldo final |
| ----- | ---- | ------ | ----------- |
| enero | 200  | 120    | 80          |

saldo inicial febrero = 80 + cupo febrero

---

# 4. Reglas de asignación de cupos

1. Un colaborador puede tener **un único cupo por mes**.

2. El cupo se define por:

* colaborador
* mes
* año

3. El cupo solo puede ser asignado por un **administrador**.

4. El cupo puede modificarse mientras el mes esté activo.

5. Si el cupo cambia, el saldo debe recalcularse automáticamente.

---

# 5. Reglas de registro de gastos

Los gastos pueden ser registrados por:

* el colaborador
* el administrador

Todo gasto debe contener:

* colaborador
* fecha
* monto
* tipo de gasto
* usuario que registró el gasto

Categorías válidas:

* combustible
* mantenimiento

Validaciones:

* el monto debe ser mayor a cero

---

# 6. Regla de saldo negativo

El sistema **NO permite registrar gastos que excedan el saldo disponible del colaborador**.

Si un gasto excede el saldo disponible:

* el sistema debe rechazar la operación
* el sistema debe mostrar un mensaje de error
* el gasto no debe registrarse

Esto garantiza que:

saldo final >= 0

---

# 7. Reglas de cálculo del saldo

saldo inicial mes = saldo final mes anterior + cupo mes actual

saldo final mes = saldo inicial mes - total gastos del mes

---

## Primer mes registrado

Si el colaborador no tiene historial previo:

saldo inicial = cupo del mes

---

## Mes sin gastos

Si no hay gastos registrados:

saldo final = saldo inicial

---

# 8. Corrección de registros

Un administrador puede:

* modificar gastos
* eliminar gastos

Cuando ocurre una corrección:

* el saldo del mes debe recalcularse
* los saldos de meses posteriores también deben recalcularse

---

# 9. Consulta de saldo

## Consulta por colaborador

Disponible para:

* administrador
* colaborador

Información mostrada:

* saldo actual
* cupo del mes
* total gastado
* saldo restante

---

## Consulta por ID (aprobadores)

Los aprobadores pueden consultar saldo ingresando el **ID del colaborador**.

El sistema mostrará:

* nombre del colaborador
* cupo del mes
* total gastado
* saldo disponible

---

# 10. Historial

El sistema debe mantener historial de:

* cupos asignados
* gastos registrados
* modificaciones
* eliminaciones

---

# 11. Auditoría

Todas las acciones deben registrarse:

* creación de colaborador
* asignación de cupo
* registro de gasto
* modificación de gasto
* eliminación de gasto

Cada registro debe incluir:

* usuario
* acción
* fecha
* entidad afectada
* valor anterior
* valor nuevo

---

# 12. Validaciones

El sistema debe validar:

* monto positivo
* colaborador existente
* cupo definido
* permisos de usuario

---

# 13. Supuestos

1. Cada colaborador tiene un único presupuesto mensual.
2. Los gastos pertenecen a un mes específico.
3. El saldo se acumula automáticamente entre meses.
4. El sistema utiliza una única moneda.
