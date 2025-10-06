# TODO — Backend Migration

> Última actualización: 2025-10-06 (Europe/Madrid)

Este checklist refleja el estado real del repo tras la última subida. Se marcan con ✅ los puntos ya implementados. Se añaden además tareas de cierre propuestas (sin tests, como se pidió).

---

## 1) Infraestructura Mongo

* ✅ **Boot de artefactos Mongo** vía `ensureMongoArtifacts()` (`src/infra/mongo/artifacts.ts`) con gating `MONGO_BOOT === '1'` (invocado desde `src/app.ts`).
* ✅ **Índices base por colección**: `eventId` y claves mínimas (arrays `*Indexes`).
* ⬜ **Documentar índices idempotentes** por colección en `docs/` (qué índices se crean y por qué).

### Acción propuesta

* ⬜ Añadir doc corta en `docs/db.indexes.md` con la lista de índices efectivos y racional.

---

## 2) Validadores / Esquemas de colección

* ✅ **Validators con `validationLevel: "strict"`** en:

    * `precios` — `src/modules/precios/precios.artifacts.ts`
    * `gastos` — `src/modules/gastos/gastos.artifacts.ts`
    * `reservas` — `src/modules/reservas/reservas.artifacts.ts`
    * `event-configs` — `src/modules/event-configs/eventConfigs.artifacts.ts`
* ⬜ **Tipos numéricos alineados con inserciones**: ahora mismo los schemas usan `bsonType: "decimal"` y los repos insertan `number` (JS). Hay que alinear.

### Acciones propuestas (elige una estrategia y aplícala en todas las colecciones afectadas)


* ⬜ ** Mantener `decimal` y convertir en repos con `Decimal128.fromString(...)` + serialización inversa.

> **Criterio de aceptación**: inserts/updates de importes no fallan con `MONGO_BOOT=1` y las consultas devuelven los importes correctamente tipados en las respuestas API.

---

## 3) Reglas de negocio

* ⬜ **Consistencia en `reservas` respecto a métodos de pago**: si un `metodoPago` requiere `receptor`, impedir `receptorId = null` en altas/ediciones.

### Acción propuesta

* ⬜ Añadir check en servicios `createReserva`/`updateReserva` cargando `event-configs` del `eventId` y validando la correspondencia.

> **Criterio de aceptación**: no se pueden crear/editar reservas incoherentes con la configuración del evento.

---

## 4) Endpoints y filtrado/ordenación

* ⬜ **Listados con filtros/orden**:

    * `listPrecios`: soportar `q` (búsqueda), orden configurable y filtros básicos.
    * `listGastos` y `listReservas`: hoy sólo filtran por `eventId`+paginación; falta parseo de `filters` y `sort`.
* ⬜ **Índices compuestos** para filtros frecuentes (p.ej. `eventId+metodoPagoId`, `eventId+fecha`, `eventId+pagado`).

### Acciones propuestas

* ⬜ Implementar parseo de `filters`/`sort` en handlers/repos.
* ⬜ Añadir 1–2 índices compuestos por colección según los filtros más usados.

> **Criterio de aceptación**: los listados devuelven resultados paginados aplicando correctamente los filtros y el orden; explain de consultas muestra uso de índices.

---

## 5) Swagger / OpenAPI

* ✅ **Swagger activable por `SWAGGER_ENABLE`** (`src/plugins/swagger.ts`) con componentes comunes (IdResponse, Paginated, etc.).
* ⬜ **Errores y ejemplos completos**:

    * Incluir respuesta `400` con un `errorSchema` en todas las rutas que validan `body/params`.
    * Añadir **examples** de request/response en POST/PUT de `gastos` y `reservas`.

### Acción propuesta

* ⬜ Completar los esquemas y examples en `gastos`/`reservas` y asegurar 400/404/409 donde aplique.

> **Criterio de aceptación**: la UI de Swagger muestra ejemplos coherentes y estados de error en todas las rutas.

---

## 6) Fechas y serialización

* ✅ Helpers `ensureDate`/`toISO` en `src/utils/dates.ts` usados en repos de `precios`, `gastos`, `reservas`.

> **Criterio de aceptación**: todas las fechas en responses están en ISO y los inserts normalizan a `Date`.

---

## 7) Selectores / esquema embebido y paridad con Front

* ⬜ **Schema de `selectores` más estricto en rutas**: actualmente se permite `additionalProperties`; alinear con lo definido en validators de colección.
* ⬜ **Nombres de claves** (`comercial`, `metodoPago`, `receptor`, `tipoConsumo`, `puntoRecogida`) verificados 1:1 con la UI.

### Acción propuesta

* ⬜ Ajustar `event-configs.schemas.ts` para cerrar el schema y reflectar exactamente los campos usados por el front.

> **Criterio de aceptación**: payloads inválidos de selectores se rechazan en capa de rutas y coinciden con lo que renderiza el front.

---

## 8) Utilidades de desarrollo



## 9) Tareas de cierre 

* ⬜ **Arreglar tipado numérico** (`decimal` vs `double` o conversión a `Decimal128`).
* ⬜ **Implementar filtros/orden en listados** y añadir **índices compuestos** básicos.
* ⬜ **Completar Swagger con errores y ejemplos** en `gastos` y `reservas`.
* ⬜ **Documentar índices** en `docs/db-indexes.md`.

---

## Anexos (referencias de código)

* `src/infra/mongo/artifacts.ts`
* `src/app.ts`
* `src/modules/precios/*`
* `src/modules/gastos/*`
* `src/modules/reservas/*`
* `src/modules/event-configs/*`
* `src/plugins/swagger.ts`
* `src/utils/dates.ts`
