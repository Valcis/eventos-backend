# Índices de MongoDB (EVENTOS backend)

> Este documento describe los índices idempotentes creados por `ensureMongoArtifacts()`, su racional y las consultas objetivo.

## Convenciones

- Todos los índices se crean con `createIndexes()` (idempotente).
- Los cambios en validadores se aplican con `collMod` cuando corresponde.
- Prefijos:
    - `IX_` índice normal
    - `UX_` índice único

---

## Colección: `gastos`

- **IX_gastos_eventId_createdAt**
    - Clave: `{ eventId: 1, createdAt: -1 }`
    - Uso: listados recientes por evento (paginación por fecha).
    - Beneficio: evita sort en memoria.
- **IX_gastos_eventId_comprobado**
    - Clave: `{ eventId: 1, comprobado: 1, createdAt: -1 }`
    - Uso: filtros habituales de comprobación + orden reciente.
- **IX_gastos_busquedaTexto**
    - Clave: `{ descripcion: "text", proveedor: "text" }`
    - Uso: búsqueda textual acotada por evento (se combina con filtro de `eventId` en query).
    - Nota: no único.

## Colección: `reservas`

- **IX_reservas_eventId_createdAt**
    - Clave: `{ eventId: 1, createdAt: -1 }`
    - Uso: listados por evento, recientes primero.
- **IX_reservas_eventId_estado**
    - Clave: `{ eventId: 1, estado: 1, createdAt: -1 }`
    - Uso: filtros por estado + orden reciente.

## Colección: `precios`

- **UX_precios_eventId_producto**
    - Clave: `{ eventId: 1, productoId: 1 }`, **único**
    - Uso: garantiza un precio activo por producto dentro de un evento.
- **IX_precios_eventId_createdAt**
    - Clave: `{ eventId: 1, createdAt: -1 }`

## Colección: `eventConfigs`

- **UX_eventConfigs_eventId_clave**
    - Clave: `{ eventId: 1, clave: 1 }`, **único**
    - Uso: evita claves duplicadas por evento.

---

## Notas de rendimiento

- Paginación V1 usa `createdAt` descendente; por eso los índices compuestos incluyen ese campo.
- Para dinero se usa `Decimal128` a nivel de almacenamiento. Serializamos a **string decimal** en API para preservar precisión.
