# Arquitectura

## Visión General

El proyecto sigue una **arquitectura en capas** con separación clara de responsabilidades:

```
┌─────────────────────────────────────┐
│   HTTP Layer (Fastify Routes)      │  ← Endpoints REST
├─────────────────────────────────────┤
│   Controllers (Generic Factory)    │  ← Lógica HTTP (req/res)
├─────────────────────────────────────┤
│   Domain Layer (Schemas/Types)     │  ← Validación y tipos de negocio
├─────────────────────────────────────┤
│   Repository Layer (CRUD Factory)  │  ← Acceso a datos
├─────────────────────────────────────┤
│   Infrastructure (MongoDB)         │  ← Base de datos
└─────────────────────────────────────┘
```

---

## Capas del Sistema

### 1. **HTTP Layer** (`modules/*/routes.ts`)

Registra endpoints HTTP usando el sistema de plugins de Fastify:

```typescript
export default async function productsRoutes(app: FastifyInstance) {
  const ctrl = makeController('products', mapIn, mapOut);
  app.get('/', ctrl.list);
  app.post('/', ctrl.create);
  app.get('/:id', ctrl.get);
  app.put('/:id', ctrl.replace);
  app.patch('/:id', ctrl.patch);
  app.delete('/:id', ctrl.remove);
}
```

**Responsabilidades**:
- Definir rutas y métodos HTTP
- Aplicar middlewares específicos
- Conectar con controladores

---

### 2. **Controller Layer** (`modules/controller.ts`)

Factory genérico que genera controladores CRUD completos:

```typescript
makeController<T>(
  collection: string,
  mapIn: (data) => Document,     // Request → MongoDB
  mapOut: (doc) => T              // MongoDB → Response
)
```

**Responsabilidades**:
- Manejo de request/response HTTP
- Validación de parámetros (id, query params)
- Códigos de estado HTTP (200, 201, 404, etc.)
- Transformación de datos (mapIn/mapOut)

**Endpoints generados**:
- \`GET /\` → listado con paginación cursor-based
- \`GET /:id\` → obtener por ID
- \`POST /\` → crear nuevo recurso
- \`PUT /:id\` → reemplazo completo
- \`PATCH /:id\` → actualización parcial
- \`DELETE /:id\` → soft delete

---

### 3. **Domain Layer** (`modules/*/schema.ts`)

Define tipos, validaciones y reglas de negocio usando **Zod**.

**Responsabilidades**:
- Validación de entrada
- Definición de tipos TypeScript
- Reglas de negocio (constraints, formatos)

---

### 4. **Repository Layer** (`infra/mongo/crud.ts`)

Factory genérico que crea repositorios CRUD type-safe:

```typescript
makeCrud<TDomain, TCreate, TUpdate>({
  collection: 'products',
  toDb: (data) => { /* transform to MongoDB doc */ },
  fromDb: (doc) => { /* transform to domain object */ },
  softDelete: true
})
```

**Operaciones**:
- \`create()\` - Inserta con timestamps y isActive
- \`getById()\` - Busca por ObjectId
- \`list()\` - Paginación cursor-based
- \`update()\` - Reemplazo completo (findOneAndReplace)
- \`patch()\` - Actualización parcial ($set)
- \`softDelete()\` - Marca isActive=false
- \`removeHard()\` - Borrado físico

**Características**:
- Timestamps automáticos (createdAt, updatedAt)
- Soft delete por defecto
- Paginación escalable (cursor sobre _id)
- Type-safe (generics en TypeScript)

---

## Patrones de Diseño

### Factory Pattern

Tanto controladores como repositorios usan el patrón Factory para generar implementaciones genéricas:

- **\`makeController()\`**: genera endpoints HTTP estándar
- **\`makeCrud()\`**: genera operaciones CRUD estándar

**Ventajas**:
- DRY (Don't Repeat Yourself) al máximo
- Consistencia en toda la API
- Fácil de extender y mantener
- Reducción de boilerplate

### Repository Pattern

Abstrae el acceso a datos detrás de una interfaz limpia que separa la lógica de negocio de la persistencia.

### Plugin Architecture (Fastify)

Fastify usa un sistema de plugins que permite:
- Composición modular
- Encapsulación de contexto
- Hooks y lifecycle management
- Inyección de dependencias (decorators)

---

## Flujo de una Request

```
1. HTTP Request → Fastify
2. Middleware (CORS, Auth, RequestId)
3. Route Handler → Controller
4. Controller → Repository (CRUD)
5. Repository → MongoDB
6. MongoDB → Repository (transform)
7. Repository → Controller
8. Controller → HTTP Response (JSON)
```

**Ejemplo: \`POST /api/products\`**

```
1. Request llega con body JSON
2. Bearer auth valida token (si AUTH_ENABLED=true)
3. productsRoutes → ctrl.create()
4. Controller llama repo.create(db, body)
5. Repository ejecuta insertOne() en MongoDB
6. Repository transforma doc MongoDB → objeto dominio
7. Controller devuelve 201 + objeto JSON
```

---

## Ver también

- [Data Model](./data-model.md) - Estructura de colecciones
- [Overview](./overview.md) - Visión general del proyecto
