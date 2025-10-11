# EVENTOS API

Versión: 1.2.0
Base URL (local): `http://localhost:3000`

## Convenciones

- **Envelope**: `{ "data": <payload>, "meta": { ... } }`
- **Paginación V1**: `page` (0-based), `pageSize` (<=100). Respuesta: `meta.total`, `meta.page`, `meta.pageSize`.
- **Errores**: `{ "ok": false, "code": "<ERROR_CODE>", "message": "..." }`

---

## Salud

### GET /health

`200 { "ok": true }`

### GET /health/db

`200 { "ok": true }` · `500 { "ok": false }`

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

### GET /api/precios

Query: `eventId` (req), `page`, `pageSize`, `q`, `expand`  
`200 { "data": [Precio], "meta": { "total": 42, "page": 0, "pageSize": 20 } }`

### POST /api/precios

Body: `eventId, concepto, importe>=0, moneda, isActive, createdAt?, updatedAt?`  
`201 { "data": Precio }`

### PUT /api/precios/:id

Body parcial (campos permitidos). `204`

### DELETE /api/precios/:id

`204`

---

## Gastos

### Modelo `Gasto`

```json
{
	"id": "string",
	"eventId": "string",
	"producto": "string",
	"unidadId": "string",
	"cantidad": 2,
	"tipoPrecio": "con IVA",
	"tipoIVA": 21,
	"precioBase": 10.0,
	"precioNeto": 12.1,
	"isPack": false,
	"unidadesPack": 1,
	"precioUnidad": 12.1,
	"pagadorId": "string",
	"tiendaId": "string",
	"notas": "string",
	"comprobado": true,
	"locked": false,
	"isActive": true,
	"createdAt": "2025-10-03T18:02:11.000Z",
	"updatedAt": "2025-10-03T18:02:11.000Z"
}
```

### GET /api/gastos

Query: `eventId` (req), `page`, `pageSize`, `filters`, `sort`, `q`, `expand`  
`200 { "data": [Gasto], "meta": { "total": 42, "page": 0, "pageSize": 20 } }`

### POST /api/gastos

Body mínimo: `eventId, producto, cantidad, tipoPrecio, precioBase, precioNeto, comprobado, locked, isActive` (+opcionales arriba)  
`201 { "data": Gasto }`

### PUT /api/gastos/:id

`204` · Actualiza campos permitidos

### DELETE /api/gastos/:id

`204`

---

## Reservas

### Modelo `Reserva`

```json
{
	"id": "string",
	"eventId": "string",
	"cliente": "string",
	"parrilladas": 3,
	"picarones": 2,
	"metodoPagoId": "string",
	"receptorId": "string",
	"tipoConsumoId": "string",
	"comercialId": "string",
	"puntoRecogidaId": "string",
	"totalPedido": 65.5,
	"pagado": true,
	"comprobado": true,
	"locked": false,
	"isActive": true,
	"createdAt": "2025-10-03T18:02:11.000Z",
	"updatedAt": "2025-10-03T18:02:11.000Z"
}
```

### GET /api/reservas

Query: `eventId` (req), `page`, `pageSize`, `filters`, `sort`, `q`, `expand`  
`200 { "data": [Reserva], "meta": { "total": 42, "page": 0, "pageSize": 20 } }`

### POST /api/reservas

Body mínimo: `eventId, cliente, totalPedido, pagado, comprobado, locked, isActive` (+opcionales arriba)  
`201 { "data": Reserva }`

### PUT /api/reservas/:id

`204` · Actualiza campos permitidos

### DELETE /api/reservas/:id

`204`

---

## Event-configs

- Validador **estricto** en DB y regla de **Bizum** aplicada en servidor.
- `GET /api/event-configs` → `200 { "data": {...} }`
- `PUT /api/event-configs/:eventId` → `200 { "data": {...} }`

---

## Notas

- **POST** devuelve siempre **objeto completo** (`{ "data": <Row> }`).
- Respuestas y filas (`Row`) usan `additionalProperties: false`.
- Validación Mongo: `event-configs` = **strict**; `precios/gastos/reservas` → **moderate** (recomendado subir a **strict** cuando no haya datos legacy).
