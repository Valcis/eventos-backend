
# API

## Envelope
Todas las respuestas siguen:
```json
{ "data": ..., "meta": { "...": "..." } }
```

### Respuesta de creación
```json
{ "data": { "id": "..." } }
```

## Recursos

### Precios
- `POST /precios`
  - **201** `{ "data": { "id": "<id>" } }`
- `GET /precios`
  - **200** `{ "data": [Precio], "meta": { "page": 1, "pageSize": 20, "total": 42 } }`

**Schema `Precio` (resumen)**
```json
{
  "type": "object",
  "required": ["eventId","concepto","importe"],
  "properties": {
    "id": {"type":"string"},
    "eventId": {"type":"string"},
    "concepto": {"type":"string"},
    "importe": {"type":"number"},
    "moneda": {"type":"string"}
  },
  "additionalProperties": false
}
```

### Gastos
- `POST /gastos` → **201** `{ "data": { "id": "<id>" } }`
- `GET /gastos` → envelope con paginación.

### Reservas
- `POST /reservas` → **201** `{ "data": { "id": "<id>" } }`
- `GET /reservas` → envelope con paginación.

### Errores
```json
{
  "error": {
    "code": "not_found",
    "message": "Recurso no encontrado"
  }
}
```
