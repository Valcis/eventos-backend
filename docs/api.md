
# EVENTOS API

Versión: 1.1.0  
Base URL (local): `http://localhost:3000`

## Convenciones generales

- **Envelope de respuesta**
  ```json
  { "data": <payload>, "meta": { ... } }
  ```
  `meta` solo aparece cuando aporta información (paginación, totales, etc).

- **Paginación V1**
  - Query: `page` (0-based), `pageSize` (máx. 100).
  - Respuesta incluye `meta.page`, `meta.pageSize`, `meta.total`.

- **Errores**
  ```json
  { "ok": false, "code": "<ERROR_CODE>", "message": "Descriptivo" }
  ```
  (En desarrollo puede incluir `stack`).

- **Autenticación**
  _No aplica por ahora._

---

## Salud

### `GET /health`

**200**
```json
{ "ok": true }
```

### `GET /health/db`

**200**
```json
{ "ok": true }
```

**500**
```json
{ "ok": false }
```

---

## Precios

### Modelo `Precio`
```json
{
  "id": "string",
  "eventId": "string",
  "concepto": "string",
  "importe": 12.34,
  "moneda": "EUR",
  "isActive": true,
  "createdAt": "2025-10-03T18:02:11.000Z",
  "updatedAt": "2025-10-03T18:02:11.000Z"
}
```

### `GET /api/precios`
Lista paginada (V1).

**Query**  
- `eventId` (string, requerido)  
- `page` (string, opcional)  
- `pageSize` (string, opcional)  
- `q` (string, opcional) — búsqueda simple

**200**
```json
{
  "data": [<Precio>],
  "meta": { "total": 42, "page": 0, "pageSize": 20 }
}
```

**400** – Validación
```json
{ "ok": false, "code": "EVENT_ID_REQUIRED", "message": "eventId es obligatorio" }
```

### `POST /api/precios`
Crea un precio. **Devuelve el objeto completo**.

**Body**
```json
{
  "eventId": "evento123",
  "concepto": "Parrillada",
  "importe": 12.5,
  "moneda": "EUR",
  "isActive": true,
  "createdAt": "2025-10-03T18:02:11.000Z",
  "updatedAt": "2025-10-03T18:02:11.000Z"
}
```

**201**
```json
{ "data": <Precio> }
```

**400** – Validación

### `PUT /api/precios/:id`
Actualiza campos permitidos (`concepto`, `importe`, `moneda`, `isActive`, `updatedAt`).

**Body (parcial)**
```json
{ "importe": 15.0 }
```

**204** – Sin contenido

### `DELETE /api/precios/:id`
**204** – Sin contenido

---

## Gastos

### Modelo `Gasto`
```json
{
  "id": "string",
  "eventId": "string",
  "concepto": "string",
  "importe": 12.34,
  "categoria": "string",
  "createdAt": "2025-10-03T18:02:11.000Z",
  "updatedAt": "2025-10-03T18:02:11.000Z"
}
```

### `GET /api/gastos`
**Query**  
- `eventId` (string, requerido)  
- `page`, `pageSize` (string, opcional)  
- `filters`, `sort`, `q` (string, opcional)  
- `expand` (string, opcional): `none | selectores | fmt | selectores,fmt`

**200**
```json
{
  "data": [<Gasto>],
  "meta": { "total": 42, "page": 0, "pageSize": 20 }
}
```

### `POST /api/gastos`
**Body**
```json
{
  "eventId": "evento123",
  "concepto": "Decoración",
  "importe": 99.9,
  "categoria": "material",
  "createdAt": "2025-10-03T18:02:11.000Z",
  "updatedAt": "2025-10-03T18:02:11.000Z"
}
```

**201**
```json
{ "data": <Gasto> }
```

### `PUT /api/gastos/:id`
**204**

### `DELETE /api/gastos/:id`
**204**

---

## Reservas

### Modelo `Reserva`
```json
{
  "id": "string",
  "eventId": "string",
  "reservaId": "string",
  "estado": "string",
  "createdAt": "2025-10-03T18:02:11.000Z",
  "updatedAt": "2025-10-03T18:02:11.000Z"
}
```

### `GET /api/reservas`
**Query**  
- `eventId` (string, requerido)  
- `page`, `pageSize` (string, opcional)  
- `filters`, `sort`, `q` (string, opcional)  
- `expand` (string, opcional)

**200**
```json
{
  "data": [<Reserva>],
  "meta": { "total": 42, "page": 0, "pageSize": 20 }
}
```

### `POST /api/reservas`
**Body**
```json
{
  "eventId": "evento123",
  "reservaId": "abc-001",
  "estado": "confirmada",
  "createdAt": "2025-10-03T18:02:11.000Z",
  "updatedAt": "2025-10-03T18:02:11.000Z"
}
```

**201**
```json
{ "data": <Reserva> }
```

### `PUT /api/reservas/:id`
**204**

### `DELETE /api/reservas/:id`
**204**

---

## Event Configs

> Reglas de negocio específicas (p. ej., "Bizum") se validan **en servidor**. El validador Mongo de `event_configs` es más estricto (`additionalProperties: false`) y puede evolucionar; consulta el repositorio para el detalle más reciente.

### `GET /api/event-configs`
Devuelve la configuración del evento (shape propio).

**200**
```json
{ "data": { /* objeto de configuración */ } }
```

### `PUT /api/event-configs/:id`
Actualiza la configuración. **200** con `{ "data": { ... } }` o **204** (según implementación).

---

## Ejemplos `curl`

```bash
# Listar precios
curl -s "http://localhost:3000/api/precios?eventId=evento123&page=0&pageSize=20"

# Crear precio
curl -s -X POST "http://localhost:3000/api/precios"   -H "Content-Type: application/json"   -d '{"eventId":"evento123","concepto":"Parrillada","importe":12.5,"moneda":"EUR","isActive":true}'
```

---

## Cambios respecto a versiones previas

- **POST** devuelve **objeto completo** (`{ "data": <Row> }`) en `precios`, `gastos`, `reservas`.
- Se recomienda `additionalProperties: false` en las respuestas de `create` y en los schemas `Row` de cada módulo.
