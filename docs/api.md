# API

**Eventos API** v3.0.0

## Base URL

```
http://localhost:3000/api
```

## Autenticación

Todas las rutas (excepto `/health` y `/swagger`) requieren autenticación Bearer Token:

```http
Authorization: Bearer YOUR_TOKEN_HERE
```

Para deshabilitar auth en desarrollo: `AUTH_ENABLED=false` en `.env`

---

## Endpoints Disponibles

### Core Resources

| Método           | Ruta                 | Descripción                  |
| ---------------- | -------------------- | ---------------------------- |
| **Events**       |                      |                              |
| GET              | `/events`            | Listar eventos               |
| POST             | `/events`            | Crear evento                 |
| GET              | `/events/{id}`       | Obtener evento por ID        |
| PUT              | `/events/{id}`       | Reemplazar evento completo   |
| PATCH            | `/events/{id}`       | Actualización parcial        |
| DELETE           | `/events/{id}`       | Soft delete (isActive=false) |
| **Reservations** |                      |                              |
| GET              | `/reservations`      | Listar reservas              |
| POST             | `/reservations`      | Crear reserva                |
| GET              | `/reservations/{id}` | Obtener reserva              |
| PUT              | `/reservations/{id}` | Reemplazar reserva           |
| PATCH            | `/reservations/{id}` | Actualización parcial        |
| DELETE           | `/reservations/{id}` | Soft delete                  |
| **Expenses**     |                      |                              |
| GET              | `/expenses`          | Listar gastos                |
| POST             | `/expenses`          | Crear gasto                  |
| GET              | `/expenses/{id}`     | Obtener gasto                |
| PUT              | `/expenses/{id}`     | Reemplazar gasto             |
| PATCH            | `/expenses/{id}`     | Actualización parcial        |
| DELETE           | `/expenses/{id}`     | Soft delete                  |

### Catalog Resources

| Método                | Ruta                      | Descripción               |
| --------------------- | ------------------------- | ------------------------- |
| **Products**          |                           |                           |
| GET                   | `/products`               | Listar productos          |
| POST                  | `/products`               | Crear producto            |
| GET                   | `/products/{id}`          | Obtener producto          |
| PUT                   | `/products/{id}`          | Actualizar producto       |
| PATCH                 | `/products/{id}`          | Parcialmente actualizar   |
| DELETE                | `/products/{id}`          | Soft delete               |
| **Promotions**        |                           |                           |
| GET                   | `/promotions`             | Listar promociones        |
| POST                  | `/promotions`             | Crear promoción           |
| GET                   | `/promotions/{id}`        | Obtener promoción         |
| PUT                   | `/promotions/{id}`        | Actualizar promoción      |
| PATCH                 | `/promotions/{id}`        | Parcialmente actualizar   |
| DELETE                | `/promotions/{id}`        | Soft delete               |
| **Salespeople**       |                           |                           |
| GET                   | `/salespeople`            | Listar vendedores         |
| POST                  | `/salespeople`            | Crear vendedor            |
| GET                   | `/salespeople/{id}`       | Obtener vendedor          |
| PUT                   | `/salespeople/{id}`       | Actualizar vendedor       |
| PATCH                 | `/salespeople/{id}`       | Parcialmente actualizar   |
| DELETE                | `/salespeople/{id}`       | Soft delete               |
| **Payment Methods**   |                           |                           |
| GET                   | `/payment-methods`        | Listar métodos de pago    |
| POST                  | `/payment-methods`        | Crear método              |
| GET                   | `/payment-methods/{id}`   | Obtener método            |
| PUT                   | `/payment-methods/{id}`   | Actualizar método         |
| PATCH                 | `/payment-methods/{id}`   | Parcialmente actualizar   |
| DELETE                | `/payment-methods/{id}`   | Soft delete               |
| **Cashiers**          |                           |                           |
| GET                   | `/cashiers`               | Listar cajeros            |
| POST                  | `/cashiers`               | Crear cajero              |
| GET                   | `/cashiers/{id}`          | Obtener cajero            |
| PUT                   | `/cashiers/{id}`          | Actualizar cajero         |
| PATCH                 | `/cashiers/{id}`          | Parcialmente actualizar   |
| DELETE                | `/cashiers/{id}`          | Soft delete               |
| **Stores**            |                           |                           |
| GET                   | `/stores`                 | Listar tiendas            |
| POST                  | `/stores`                 | Crear tienda              |
| GET                   | `/stores/{id}`            | Obtener tienda            |
| PUT                   | `/stores/{id}`            | Actualizar tienda         |
| PATCH                 | `/stores/{id}`            | Parcialmente actualizar   |
| DELETE                | `/stores/{id}`            | Soft delete               |
| **Units**             |                           |                           |
| GET                   | `/units`                  | Listar unidades           |
| POST                  | `/units`                  | Crear unidad              |
| GET                   | `/units/{id}`             | Obtener unidad            |
| PUT                   | `/units/{id}`             | Actualizar unidad         |
| PATCH                 | `/units/{id}`             | Parcialmente actualizar   |
| DELETE                | `/units/{id}`             | Soft delete               |
| **Consumption Types** |                           |                           |
| GET                   | `/consumption-types`      | Listar tipos de consumo   |
| POST                  | `/consumption-types`      | Crear tipo                |
| GET                   | `/consumption-types/{id}` | Obtener tipo              |
| PUT                   | `/consumption-types/{id}` | Actualizar tipo           |
| PATCH                 | `/consumption-types/{id}` | Parcialmente actualizar   |
| DELETE                | `/consumption-types/{id}` | Soft delete               |
| **Payers**            |                           |                           |
| GET                   | `/payers`                 | Listar pagadores          |
| POST                  | `/payers`                 | Crear pagador             |
| GET                   | `/payers/{id}`            | Obtener pagador           |
| PUT                   | `/payers/{id}`            | Actualizar pagador        |
| PATCH                 | `/payers/{id}`            | Parcialmente actualizar   |
| DELETE                | `/payers/{id}`            | Soft delete               |
| **Pickup Points**     |                           |                           |
| GET                   | `/pickup-points`          | Listar puntos de recogida |
| POST                  | `/pickup-points`          | Crear punto               |
| GET                   | `/pickup-points/{id}`     | Obtener punto             |
| PUT                   | `/pickup-points/{id}`     | Actualizar punto          |
| PATCH                 | `/pickup-points/{id}`     | Parcialmente actualizar   |
| DELETE                | `/pickup-points/{id}`     | Soft delete               |
| **Partners**          |                           |                           |
| GET                   | `/partners`               | Listar socios             |
| POST                  | `/partners`               | Crear socio               |
| GET                   | `/partners/{id}`          | Obtener socio             |
| PUT                   | `/partners/{id}`          | Actualizar socio          |
| PATCH                 | `/partners/{id}`          | Parcialmente actualizar   |
| DELETE                | `/partners/{id}`          | Soft delete               |

### System Endpoints

| Método | Ruta       | Descripción                      |
| ------ | ---------- | -------------------------------- |
| GET    | `/health`  | Health check (sin auth)          |
| GET    | `/swagger` | Documentación OpenAPI (sin auth) |

---

## Paginación y Sorting

Todos los endpoints de listado (`GET /`) soportan paginación cursor-based y sorting dinámico:

### Query Parameters

**Paginación**:

- `limit` - Número de items por página (min: 1, max: 200, default: 50)
- `after` - Cursor para la siguiente página (ObjectId del último elemento)

**Sorting dinámico**:

- `sortBy` - Campo por el cual ordenar (ej: `name`, `createdAt`, `date`)
- `sortDir` - Dirección del ordenamiento: `asc` (ascendente) o `desc` (descendente, default)

**Filtros**:

- Cualquier campo de la colección (ej: `?eventId=abc&isActive=true`)

### Response Format

```json
{
  "ok": true,
  "data": [...],
  "page": {
    "limit": 50,
    "nextCursor": "6745abc123...",
    "total": 150
  }
}
```

### Ejemplos

```bash
# Primera página (default: ordenado por createdAt desc)
curl "http://localhost:3000/api/products?limit=10"

# Segunda página (usar nextCursor de la respuesta anterior)
curl "http://localhost:3000/api/products?limit=10&after=6745abc123..."

# Ordenar por nombre ascendente
curl "http://localhost:3000/api/products?sortBy=name&sortDir=asc"

# Ordenar por fecha descendente (más reciente primero)
curl "http://localhost:3000/api/events?sortBy=date&sortDir=desc&limit=20"

# Combinar sorting con filtros
curl "http://localhost:3000/api/products?eventId=abc123&sortBy=price&sortDir=asc"
```

**Campos ordenables comunes**:

- `createdAt` - Fecha de creación (default en la mayoría de endpoints)
- `updatedAt` - Última modificación
- `name` - Nombre (catálogos)
- `date` - Fecha (eventos)
- Cualquier campo indexado de la colección

---

## Ejemplos de Uso

### Crear un Evento

```http
POST /api/events
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "name": "Fiesta de Verano 2025",
  "date": "2025-07-15T20:00:00Z",
  "capacity": 500,
  "capitalAmount": "5000.00"
}
```

**Response (201 Created)**:

```json
{
	"id": "6745abc123def456...",
	"name": "Fiesta de Verano 2025",
	"date": "2025-07-15T20:00:00.000Z",
	"capacity": 500,
	"capitalAmount": "5000.00",
	"isActive": true,
	"createdAt": "2025-01-15T10:30:00.000Z",
	"updatedAt": "2025-01-15T10:30:00.000Z"
}
```

---

### Crear un Producto

```http
POST /api/products
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "eventId": "6745abc123...",
  "name": "Cerveza Artesanal",
  "description": "Cerveza IPA de producción local",
  "stock": 100,
  "nominalPrice": "5.50",
  "supplement": {
    "6745consumptionType1": 1,
    "6745consumptionType2": 2
  },
  "promotions": ["6745promo123..."]
}
```

**Response (201 Created)**:

```json
{
	"id": "6745def456...",
	"eventId": "6745abc123...",
	"name": "Cerveza Artesanal",
	"description": "Cerveza IPA de producción local",
	"stock": 100,
	"nominalPrice": "5.50",
	"supplement": {
		"6745consumptionType1": 1,
		"6745consumptionType2": 2
	},
	"promotions": ["6745promo123..."],
	"isActive": true,
	"createdAt": "2025-01-15T10:35:00.000Z",
	"updatedAt": "2025-01-15T10:35:00.000Z"
}
```

---

### Crear una Reserva

```http
POST /api/reservations
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "eventId": "6745abc123...",
  "reserver": "Juan Pérez",
  "order": {
    "6745def456...": 10,
    "6745ghi789...": 5
  },
  "salespersonId": "6745jkl012...",
  "consumptionTypeId": "6745mno345...",
  "paymentMethodId": "6745pqr678...",
  "cashierId": "6745stu901...",
  "deposit": "50.00"
}
```

**Response (201 Created)**:

```json
{
	"id": "6745vwx234...",
	"eventId": "6745abc123...",
	"reserver": "Juan Pérez",
	"order": {
		"6745def456...": 10,
		"6745ghi789...": 5
	},
	"totalAmount": "82.50",
	"hasPromoApplied": false,
	"deposit": "50.00",
	"isDelivered": false,
	"isPaid": false,
	"salespersonId": "6745jkl012...",
	"consumptionTypeId": "6745mno345...",
	"paymentMethodId": "6745pqr678...",
	"cashierId": "6745stu901...",
	"linkedReservations": [],
	"isActive": true,
	"createdAt": "2025-01-15T11:00:00.000Z",
	"updatedAt": "2025-01-15T11:00:00.000Z"
}
```

---

### Actualización Parcial (PATCH)

```http
PATCH /api/reservations/6745vwx234...
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "isPaid": true,
  "isDelivered": true
}
```

**Response (200 OK)**:

```json
{
  "id": "6745vwx234...",
  "isPaid": true,
  "isDelivered": true,
  "updatedAt": "2025-01-15T14:30:00.000Z",
  ...
}
```

---

### Filtrar Reservas por Evento

```http
GET /api/reservations?eventId=6745abc123...&isPaid=false&limit=20
Authorization: Bearer TOKEN
```

**Response (200 OK)**:

```json
{
  "items": [
    {
      "id": "6745vwx234...",
      "eventId": "6745abc123...",
      "reserver": "Juan Pérez",
      "totalAmount": "82.50",
      "isPaid": false,
      ...
    },
    ...
  ],
  "page": {
    "limit": 20,
    "nextCursor": "6745xyz567...",
    "total": 45
  }
}
```

---

### Soft Delete

```http
DELETE /api/products/6745def456...
Authorization: Bearer TOKEN
```

**Response (204 No Content)**

El recurso queda marcado con `isActive: false` pero no se borra físicamente.

---

## Códigos de Estado HTTP

| Código | Descripción                                |
| ------ | ------------------------------------------ |
| 200    | OK - Operación exitosa                     |
| 201    | Created - Recurso creado                   |
| 204    | No Content - Borrado exitoso               |
| 400    | Bad Request - Datos inválidos              |
| 401    | Unauthorized - Token faltante o inválido   |
| 404    | Not Found - Recurso no encontrado          |
| 500    | Internal Server Error - Error del servidor |

---

## Formatos de Datos

### Money (Importes)

Representados como **strings con 2 decimales**:

```json
{
	"price": "15.99",
	"deposit": "50.00",
	"totalAmount": "1234.56"
}
```

Patrón regex: `^-?(0|[1-9]\d{0,4})\.\d{2}$`

### Dates

ISO 8601 UTC:

```json
{
	"createdAt": "2025-01-15T10:30:00.000Z",
	"date": "2025-07-15T20:00:00Z"
}
```

### IDs

ObjectId de MongoDB representados como strings:

```json
{
	"id": "6745abc123def456789...",
	"eventId": "6745abc123..."
}
```

---

## Ver también

- [OpenAPI Spec](../openapi/openapi.yaml) - Especificación completa
- [Pagination](./pagination.md) - Detalles de paginación
- [Data Model](./data-model.md) - Estructura de datos
