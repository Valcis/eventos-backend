# EVENTOS API - Documentación Completa

**Versión**: 3.0.0
**Generado**: 2025-11-16

---

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Autenticación](#autenticación)
- [Paginación](#paginación)
- [Populate Strategy](#populate-strategy)
- [Códigos de Error](#códigos-de-error)
- [Endpoints](#endpoints)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Events](#events)
  - [Reservations](#reservations)
  - [Products](#products)
  - [Promotions](#promotions)
  - [Expenses](#expenses)
  - [Salespeople](#salespeople)
  - [Payment Methods](#payment-methods)
  - [Cashiers](#cashiers)
  - [Stores](#stores)
  - [Units](#units)
  - [Consumption Types](#consumption-types)
  - [Payers](#payers)
  - [Pickup Points](#pickup-points)
  - [Partners](#partners)

---

## 📖 Introducción

EVENTOS API es un sistema backend para gestión de eventos (conciertos, ferias, conferencias, etc.) construido con:

- **TypeScript + Fastify + MongoDB**
- **Multi-tenant por evento**: Todos los datos particionados por `eventId`
- **Paginación cursor-based**: No offset/limit
- **Soft delete**: Entidades se marcan como `isActive: false`
- **Populate automático**: Referencias se devuelven como objetos completos

### Base URL

```
http://localhost:3000/api
```

Para producción, usar:
```
https://api.eventos.example.com/api
```

---

## 🔐 Autenticación

El API soporta **dos estrategias** de autenticación (mutuamente excluyentes):

### 1. JWT Local (Email/Password)

**Configuración:**
```bash
AUTH_ENABLED=true
AUTH0_ENABLED=false
JWT_SECRET=your-secret-key-min-32-chars
```

**Header:**
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Flujo:**
1. `POST /api/auth/register` o `POST /api/auth/login` → obtener `accessToken` y `refreshToken`
2. Usar `accessToken` en header `Authorization`
3. Cuando expire (24h), usar `POST /api/auth/refresh` con `refreshToken`

### 2. Auth0 OAuth (Social Login)

**Configuración:**
```bash
AUTH_ENABLED=false
AUTH0_ENABLED=true
AUTH0_DOMAIN=tu-tenant.auth0.com
AUTH0_AUDIENCE=https://api.tu-app.com
```

**Header:**
```http
Authorization: Bearer YOUR_AUTH0_TOKEN
```

### Rutas Públicas (sin autenticación)

- `GET /health`
- `GET /swagger`
- `POST /api/auth/register`
- `POST /api/auth/login`

---

## 📄 Paginación

Todos los endpoints de listado (GET) usan **paginación cursor-based**:

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Items por página (max: 100) |
| `after` | string | - | Cursor para siguiente página |
| `sortBy` | string | createdAt | Campo de ordenamiento |
| `sortDir` | string | desc | Dirección: asc \| desc |
| `eventId` | string | - | Filtrar por evento (requerido en la mayoría) |
| `isActive` | boolean | true | Filtrar por estado activo |

### Ejemplo de Respuesta

```json
{
  "ok": true,
  "data": [
    { "id": "...", "name": "...", ... },
    { "id": "...", "name": "...", ... }
  ],
  "page": {
    "limit": 50,
    "nextCursor": "507f1f77bcf86cd799439011",
    "total": 150
  }
}
```

### Siguiente Página

```http
GET /api/products?eventId=abc123&limit=50&after=507f1f77bcf86cd799439011
```

---

## 🔗 Populate Strategy

Las respuestas del API devuelven **objetos completos** en lugar de solo IDs.

### Antes (solo IDs)

```json
{
  "id": "abc123",
  "payerId": "def456",
  "storeId": "ghi789"
}
```

### Ahora (populate automático)

```json
{
  "id": "abc123",
  "payer": {
    "id": "def456",
    "name": "Organización Principal",
    "phone": "+34600123456",
    "isActive": true
  },
  "store": {
    "id": "ghi789",
    "name": "Mercado Central",
    "seller": "Juan García",
    "isActive": true
  }
}
```

### Módulos con Populate

- **Expenses**: `payer`, `store?`, `unit?`
- **Reservations**: `salesperson?`, `consumptionType`, `pickupPoint?`, `paymentMethod`, `cashier?`
- **Products**: `promotions[]`
- **Promotions**: `applicables[]` (productos)

**Ventaja**: Frontend obtiene toda la información en 1 request (no múltiples roundtrips)

Ver más detalles en: [docs/populate-strategy.md](./populate-strategy.md)

---

## ⚠️ Códigos de Error

| Código | Descripción | Ejemplo |
|--------|-------------|---------|
| 400 | Bad Request | Validación fallida, parámetros inválidos |
| 401 | Unauthorized | Falta token de autenticación |
| 403 | Forbidden | Sin permisos para realizar la operación |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Violación de unicidad (nombre duplicado) |
| 500 | Internal Server Error | Error inesperado del servidor |

### Formato de Respuesta de Error

```json
{
  "ok": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "error": "Bad Request",
  "message": "Error de validación en los datos enviados",
  "details": [
    {
      "path": "name",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
```

---

## 🚀 Endpoints


### Authentication

Autenticación con JWT (local) o Auth0 (OAuth social)

**Base Path:** `/api/auth`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Registrar nuevo usuario con email/password | ❌ |
| `POST` | `/api/auth/login` | Iniciar sesión con email/password | ❌ |
| `POST` | `/api/auth/refresh` | Renovar access token usando refresh token | ❌ |
| `GET` | `/api/auth/me` | Obtener información del usuario autenticado | ✅ |
| `POST` | `/api/auth/change-password` | Cambiar contraseña del usuario autenticado | ✅ |


### Users

Gestión de usuarios del sistema

**Base Path:** `/api/users`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/users` | Listar usuarios (con paginación cursor-based) | ✅ |
| `GET` | `/api/users/:id` | Obtener usuario por ID | ✅ |
| `POST` | `/api/users` | Crear nuevo usuario | ✅ |
| `PUT` | `/api/users/:id` | Reemplazar usuario completo | ✅ |
| `PATCH` | `/api/users/:id` | Actualización parcial de usuario | ✅ |
| `DELETE` | `/api/users/:id` | Soft delete (isActive=false) | ✅ |


### Events

Gestión de eventos (conciertos, ferias, conferencias, etc.)

**Base Path:** `/api/events`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/events` | Listar eventos | ✅ |
| `GET` | `/api/events/:id` | Obtener evento por ID | ✅ |
| `POST` | `/api/events` | Crear nuevo evento | ✅ |
| `PUT` | `/api/events/:id` | Reemplazar evento completo | ✅ |
| `PATCH` | `/api/events/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/events/:id` | Soft delete | ✅ |


### Reservations

Gestión de reservas/pedidos para eventos

**Base Path:** `/api/reservations`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/reservations` | Listar reservas (filtrar por eventId) | ✅ |
| `GET` | `/api/reservations/:id` | Obtener reserva por ID | ✅ |
| `GET` | `/api/reservations/:id/invoice` | Obtener factura/comprobante de reserva en PDF | ✅ |
| `POST` | `/api/reservations` | Crear nueva reserva (valida stock, aplica promociones) | ✅ |
| `PUT` | `/api/reservations/:id` | Reemplazar reserva completa | ✅ |
| `PATCH` | `/api/reservations/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/reservations/:id` | Soft delete (libera stock) | ✅ |


### Products

Catálogo de productos por evento

**Base Path:** `/api/products`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/products` | Listar productos (filtrar por eventId) | ✅ |
| `GET` | `/api/products/:id` | Obtener producto por ID | ✅ |
| `POST` | `/api/products` | Crear nuevo producto | ✅ |
| `PUT` | `/api/products/:id` | Reemplazar producto completo | ✅ |
| `PATCH` | `/api/products/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/products/:id` | Soft delete | ✅ |


### Promotions

Promociones y descuentos (3x2, segunda unidad 50% OFF, etc.)

**Base Path:** `/api/promotions`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/promotions` | Listar promociones (filtrar por eventId) | ✅ |
| `GET` | `/api/promotions/:id` | Obtener promoción por ID | ✅ |
| `POST` | `/api/promotions` | Crear nueva promoción | ✅ |
| `PUT` | `/api/promotions/:id` | Reemplazar promoción completa | ✅ |
| `PATCH` | `/api/promotions/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/promotions/:id` | Soft delete | ✅ |


### Expenses

Gastos del evento

**Base Path:** `/api/expenses`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/expenses` | Listar gastos (filtrar por eventId) | ✅ |
| `GET` | `/api/expenses/:id` | Obtener gasto por ID | ✅ |
| `POST` | `/api/expenses` | Crear nuevo gasto | ✅ |
| `PUT` | `/api/expenses/:id` | Reemplazar gasto completo | ✅ |
| `PATCH` | `/api/expenses/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/expenses/:id` | Soft delete | ✅ |


### Salespeople

Catálogo de vendedores por evento

**Base Path:** `/api/salespeople`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/salespeople` | Listar vendedores | ✅ |
| `GET` | `/api/salespeople/:id` | Obtener vendedor por ID | ✅ |
| `POST` | `/api/salespeople` | Crear vendedor | ✅ |
| `PUT` | `/api/salespeople/:id` | Reemplazar vendedor | ✅ |
| `PATCH` | `/api/salespeople/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/salespeople/:id` | Soft delete | ✅ |


### Payment Methods

Catálogo de métodos de pago por evento

**Base Path:** `/api/payment-methods`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/payment-methods` | Listar métodos de pago | ✅ |
| `GET` | `/api/payment-methods/:id` | Obtener método por ID | ✅ |
| `POST` | `/api/payment-methods` | Crear método de pago | ✅ |
| `PUT` | `/api/payment-methods/:id` | Reemplazar método | ✅ |
| `PATCH` | `/api/payment-methods/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/payment-methods/:id` | Soft delete | ✅ |


### Cashiers

Catálogo de cajeros por evento

**Base Path:** `/api/cashiers`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/cashiers` | Listar cajeros | ✅ |
| `GET` | `/api/cashiers/:id` | Obtener cajero por ID | ✅ |
| `POST` | `/api/cashiers` | Crear cajero | ✅ |
| `PUT` | `/api/cashiers/:id` | Reemplazar cajero | ✅ |
| `PATCH` | `/api/cashiers/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/cashiers/:id` | Soft delete | ✅ |


### Stores

Catálogo de tiendas/proveedores por evento

**Base Path:** `/api/stores`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/stores` | Listar tiendas | ✅ |
| `GET` | `/api/stores/:id` | Obtener tienda por ID | ✅ |
| `POST` | `/api/stores` | Crear tienda | ✅ |
| `PUT` | `/api/stores/:id` | Reemplazar tienda | ✅ |
| `PATCH` | `/api/stores/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/stores/:id` | Soft delete | ✅ |


### Units

Catálogo de unidades de medida por evento

**Base Path:** `/api/units`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/units` | Listar unidades | ✅ |
| `GET` | `/api/units/:id` | Obtener unidad por ID | ✅ |
| `POST` | `/api/units` | Crear unidad | ✅ |
| `PUT` | `/api/units/:id` | Reemplazar unidad | ✅ |
| `PATCH` | `/api/units/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/units/:id` | Soft delete | ✅ |


### Consumption Types

Catálogo de tipos de consumo por evento (en local, para llevar, delivery)

**Base Path:** `/api/consumption-types`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/consumption-types` | Listar tipos de consumo | ✅ |
| `GET` | `/api/consumption-types/:id` | Obtener tipo por ID | ✅ |
| `POST` | `/api/consumption-types` | Crear tipo de consumo | ✅ |
| `PUT` | `/api/consumption-types/:id` | Reemplazar tipo | ✅ |
| `PATCH` | `/api/consumption-types/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/consumption-types/:id` | Soft delete | ✅ |


### Payers

Catálogo de pagadores de gastos por evento

**Base Path:** `/api/payers`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/payers` | Listar pagadores | ✅ |
| `GET` | `/api/payers/:id` | Obtener pagador por ID | ✅ |
| `POST` | `/api/payers` | Crear pagador | ✅ |
| `PUT` | `/api/payers/:id` | Reemplazar pagador | ✅ |
| `PATCH` | `/api/payers/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/payers/:id` | Soft delete | ✅ |


### Pickup Points

Catálogo de puntos de recogida por evento

**Base Path:** `/api/pickup-points`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/pickup-points` | Listar puntos de recogida | ✅ |
| `GET` | `/api/pickup-points/:id` | Obtener punto por ID | ✅ |
| `POST` | `/api/pickup-points` | Crear punto de recogida | ✅ |
| `PUT` | `/api/pickup-points/:id` | Reemplazar punto | ✅ |
| `PATCH` | `/api/pickup-points/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/pickup-points/:id` | Soft delete | ✅ |


### Partners

Catálogo de colaboradores/partners por evento

**Base Path:** `/api/partners`

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/partners` | Listar partners | ✅ |
| `GET` | `/api/partners/:id` | Obtener partner por ID | ✅ |
| `POST` | `/api/partners` | Crear partner | ✅ |
| `PUT` | `/api/partners/:id` | Reemplazar partner | ✅ |
| `PATCH` | `/api/partners/:id` | Actualización parcial | ✅ |
| `DELETE` | `/api/partners/:id` | Soft delete | ✅ |


---

## 📚 Documentación Adicional

- **Swagger UI**: [`http://localhost:3000/swagger`](http://localhost:3000/swagger)
- **Arquitectura**: [docs/architecture.md](./architecture.md)
- **Modelo de Datos**: [docs/data-model.md](./data-model.md)
- **Populate Strategy**: [docs/populate-strategy.md](./populate-strategy.md)
- **Códigos de Error**: [docs/error-codes.md](./error-codes.md)
- **Variables de Entorno**: [docs/env.md](./env.md)

---

**Generado automáticamente** | [GitHub](https://github.com/tu-org/eventos-backend)
