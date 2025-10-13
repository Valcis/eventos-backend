# Overview del Proyecto

## 📋 ¿De qué va el proyecto?

**Eventos Backend** es una API REST para **gestionar eventos y reservas**, diseñada para controlar la venta de productos en eventos (tipo catering/hostelería). Permite:

- Crear eventos con productos, promociones, gastos
- Gestionar reservas con órdenes de productos
- Controlar vendedores, cajas, métodos de pago, puntos de recogida
- Gestionar catálogos (productos, tiendas, unidades, tipos de consumo, etc.)

---

## 🗂️ Colecciones MongoDB

Según el `data_model.puml`, el proyecto tiene **14 colecciones**:

### Core:
- **Events** - Evento principal (nombre, fecha, capacidad, capital)
- **Reservations** - Reservas con orden de productos, totales, estado pago/entrega

### Catálogos (todos tienen `eventId`):
- **Products** - Productos con stock, promociones y suplementos por tipo de consumo
- **Promotions** - Promociones con reglas (descuentos, 2x1, etc.)
- **Expenses** - Gastos/ingredientes del evento
- **Salespeople** - Vendedores
- **PaymentMethods** - Formas de pago
- **Cashiers** - Cajeros
- **Stores** - Tiendas/proveedores
- **Units** - Unidades de medida
- **ConsumptionTypes** - Tipos de consumo (barra, terraza, etc.)
- **Payers** - Pagadores de gastos
- **PickupPoints** - Puntos de recogida
- **Partners** - Socios del evento

---

## 🏗️ Estructura del Proyecto

```
src/
├── app.ts                    # Configuración Fastify + registro de rutas
├── server.ts                 # Entry point (levanta el servidor)
├── config/                   # Variables de entorno
├── core/                     # Núcleo (logging, HTTP utils, errores)
├── infra/mongo/              # Capa de datos MongoDB
│   ├── crud.ts               # ⭐ Factory CRUD genérico
│   └── artifacts.ts          # Índices/constraints MongoDB
├── modules/                  # Módulos de negocio
│   ├── controller.ts         # ⭐ Factory de controladores genérico
│   ├── events/               # Eventos (routes + controller + schema)
│   ├── reservations/         # Reservas
│   ├── expenses/             # Gastos
│   └── catalogs/             # Catálogos (products, promotions, etc.)
├── plugins/                  # Plugins Fastify (CORS, auth, swagger)
├── system/                   # Rutas sistema (health, swagger)
└── scripts/                  # Scripts CLI (seed, checks)
```

---

## ⚙️ Cómo funciona

### 1. CRUD Genérico (`infra/mongo/crud.ts`)

El corazón del proyecto es `makeCrud()`, una **factory que genera repositorios CRUD completos** para cualquier colección:

```typescript
makeCrud<TDomain, TCreate, TUpdate>({
  collection: 'products',
  toDb: (data) => { /* convierte input a MongoDB doc */ },
  fromDb: (doc) => { /* convierte MongoDB doc a objeto dominio */ },
  softDelete: true,  // soft delete por defecto (isActive=false)
})
```

**Operaciones**:
- `create()` - inserta con `createdAt`, `updatedAt`, `isActive: true`
- `getById()` - busca por `_id` (ObjectId)
- `list()` - paginación por **cursor** (`after=_id`, `limit`, `total`)
- `update()` - reemplazo completo
- `patch()` - actualización parcial (`$set`)
- `softDelete()` - marca `isActive=false` (o borra físico si `softDelete=false`)
- `removeHard()` - borrado físico explícito

📍 Ver: `src/infra/mongo/crud.ts:61-164`

---

### 2. Controladores Genéricos (`modules/controller.ts`)

`makeController()` envuelve un `CrudRepo` y **genera endpoints HTTP automáticamente**:

```typescript
makeController<T>(
  'products',                              // nombre colección
  (d) => d,                                // mapIn: input → MongoDB
  (doc) => ({ id: String(doc._id), ...doc }) // mapOut: MongoDB → respuesta
)
```

**Endpoints generados**:
- `GET /` → `list()` (con query params `?limit=10&after=cursor`)
- `GET /:id` → `get()`
- `POST /` → `create()`
- `PUT /:id` → `replace()`
- `PATCH /:id` → `patch()`
- `DELETE /:id` → `remove()` (soft delete)

📍 Ver: `src/modules/controller.ts:5-69`

---

### 3. Carga de Endpoints

En `app.ts`, se registran **todas las rutas** usando `app.register()`:

```typescript
await app.register(eventsRoutes, { prefix: '/api/events' });
await app.register(productsRoutes, { prefix: '/api/products' });
// ... etc
```

Cada módulo (ej. `products/routes.ts`) hace:

```typescript
export default async function productsRoutes(app: FastifyInstance) {
  const ctrl = makeController('products', mapIn, mapOut);
  app.get('/', ctrl.list);
  app.post('/', ctrl.create);
  // ... etc
}
```

📍 Ver: `src/app.ts:58-71` y `src/modules/catalogs/products/routes.ts:4-18`

---

### 4. Generación de Swagger

El swagger **se carga desde un archivo YAML estático** (`openapi/openapi.yaml`):

1. **Plugin Swagger** (`plugins/swagger.ts`):
   - Lee `openapi/openapi.yaml` con la biblioteca `yaml`
   - Registra `@fastify/swagger` con el documento parseado
   - Registra `@fastify/swagger-ui` en `/swagger`

2. **Ruta `/swagger`** registrada en `app.ts`:
   ```typescript
   await app.register(swaggerModule, { prefix: '/swagger' });
   ```

3. **El OpenAPI define**:
   - Schemas de datos (Event, Reservation, Product, etc.)
   - Endpoints con request/response
   - Autenticación Bearer JWT

📍 Ver: `src/plugins/swagger.ts:31-59` y `openapi/openapi.yaml`

---

## 🔐 Seguridad y Middleware

- **Bearer Auth** (`plugins/bearer.ts`): protege todas las rutas excepto `/health` y `/swagger`
- **CORS** (`plugins/cors.ts`): configurado para desarrollo
- **Request ID**: logging con trazabilidad (`core/logging/requestId.ts`)
- **Error Handler**: captura errores y devuelve JSON estándar

---

## 🚀 Flujo de Arranque

1. `server.ts` → `buildApp()`
2. Conecta a MongoDB (`MongoClient`)
3. Crea índices/constraints si `MONGO_BOOT=1` (`infra/mongo/artifacts.ts`)
4. Registra plugins (CORS, auth, swagger)
5. Registra rutas de módulos (`/events`, `/products`, etc.)
6. Levanta servidor en puerto `env.PORT`

📍 Ver: `src/server.ts:6-14`

---

## 📊 Características Clave

✅ **CRUD genérico reutilizable** (DRY al máximo)
✅ **Soft delete por defecto** (`isActive: false`)
✅ **Paginación cursor-based** (escalable, no usa `skip`)
✅ **Timestamps automáticos** (`createdAt`, `updatedAt`)
✅ **OpenAPI/Swagger estático** (documentación completa)
✅ **TypeScript strict** + ESLint + Prettier
✅ **Fastify** (framework rápido y moderno)
✅ **Logging estructurado** con Pino

---

## 🔗 Documentación Relacionada

- [Data Model](./data_model.puml) - Diagrama UML de colecciones y relaciones
- [Architecture](./architecture.md) - Detalles de arquitectura
- [API Documentation](./api.md) - Detalles de endpoints
- [Operations](./operations.md) - Guía de operaciones
