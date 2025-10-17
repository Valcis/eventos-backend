# CICLO DE VIDA COMPLETO DEL BACKEND

## ÍNDICE

1. Arranque del servidor
2. Creación de colecciones e índices
3. Validaciones: Qué, Cuándo y Dónde
4. Flujo completo de una request
5. Gaps de validación (lo que falta)

---

## 1. ARRANQUE DEL SERVIDOR - FASE POR FASE

### 🔵 FASE 1: Carga de Configuración (ENV)

**Archivo:** `src/server.ts:5`

```typescript
const env = getEnv();
```

**¿Qué hace?**

1. Carga variables de `.env` con dotenv
2. Valida con Zod schema en `config/env.ts`
3. Si falta algo obligatorio → **CRASH INMEDIATO** con error descriptivo

**Schema de validación:**

```typescript
const Env = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	BASE_PATH: z.string().default('/api'),
	MONGO_URL: z.string().min(1), // ❌ REQUERIDO
	MONGODB_DB: z.string().min(1), // ❌ REQUERIDO
	MONGO_BOOT: z.enum(['0', '1']).default('0'),
	AUTH_ENABLED: z.coerce.boolean().default(false),
});
```

**Resultado:**

- ✅ Variables validadas y parseadas
- ✅ Tipos TypeScript garantizados
- ❌ Si falta `MONGO_URL` o `MONGODB_DB` → **process.exit(1)**

---

### 🔵 FASE 2: Construcción de la App

**Archivo:** `src/server.ts:7`

```typescript
buildApp().then((app) => { ... })
```

**¿Qué hace `buildApp()`?** (`src/app.ts:29-111`)

#### PASO 2.1: Conectar MongoDB

**Líneas 29-31:**

```typescript
const client = new MongoClient(env.MONGO_URL);
await client.connect();
const db = client.db(env.MONGODB_DB);
```

**Lo que ocurre:**

1. Crea cliente de MongoDB
2. **Establece conexión TCP** (puede tardar 1-5 segundos)
3. Si falla → **CRASH con error de conexión**
4. Selecciona base de datos

**⚠️ IMPORTANTE:**

- En este momento las **colecciones NO existen aún**
- MongoDB crea colecciones **lazy** (al primer insert)
- Los **índices NO están creados** todavía

---

#### PASO 2.2: Crear instancia Fastify

**Líneas 33-36:**

```typescript
const app = Fastify({
	logger: buildLoggerOptions(),
	disableRequestLogging: true,
});
```

**Configuración de logging:**

- Nivel: `process.env.LOG_LEVEL ?? 'info'`
- Sin logs automáticos de requests (se hace manual en `onResponse`)

---

#### PASO 2.3: Decorar app con BD

**Línea 38:**

```typescript
app.decorate('db', db);
```

**Propósito:**

- Inyecta instancia de BD en `app`
- Accesible desde todos los handlers: `req.server.db`

---

#### PASO 2.4: (OPCIONAL) Crear Índices y Validadores

**Líneas 40-48:**

```typescript
if (env.MONGO_BOOT === '1') {
	try {
		await ensureMongoArtifacts(db);
		app.log.info('Mongo artifacts ensured ✔');
	} catch (err) {
		app.log.error({ err }, 'Mongo artifacts failed');
		throw err;
	}
}
```

**🔴 CRÍTICO - AQUÍ SE CREAN LAS COLECCIONES E ÍNDICES**

##### ¿Qué hace `ensureMongoArtifacts()`?

**Archivo:** `src/infra/mongo/artifacts.ts:14-101`

```typescript
export async function ensureMongoArtifacts(db: Db): Promise<void> {
  // EVENTS
  await ensure(db, 'events', [
    { key: { date: 1 }, name: 'idx_events_date' },
    { key: { name: 1 }, name: 'uniq_events_name', unique: true, collation: ci },
  ]);

  // RESERVATIONS
  await ensure(db, 'reservations', [
    { key: { eventId: 1, createdAt: -1 }, name: 'idx_reservations_eventId_createdAt' },
    // ... 6 índices más
  ]);

  // PRODUCTS, PROMOTIONS, EXPENSES...
  // ... 30+ índices en total

  // CATÁLOGOS (9 colecciones)
  const catalogs = ['units', 'salespeople', 'paymentmethods', ...];
  for (const col of catalogs) {
    await ensure(db, col, [
      { key: { eventId: 1 }, name: `idx_${col}_eventId` },
      { key: { eventId: 1, name: 1 }, name: `uniq_${col}_eventId_name`, unique: true, collation: ci },
    ]);
  }
}
```

**Función auxiliar `ensure()`:**

```typescript
async function ensure(db: Db, col: string, specs: IndexDescription[]): Promise<void> {
	if (specs.length === 0) return;
	await db.collection(col).createIndexes(specs);
}
```

**¿Qué hace `createIndexes()`?**

1. Si la colección NO existe → **la crea vacía**
2. Si el índice NO existe → **lo crea**
3. Si el índice YA existe con misma definición → **no hace nada** (idempotente)
4. Si el índice existe con definición diferente → **ERROR** (hay que borrar manualmente)

**Resultado:**

- ✅ 13+ colecciones creadas (vacías)
- ✅ 37+ índices creados
- ✅ Constraints de unicidad aplicados

**⚠️ IMPORTANTE:**

- Si `MONGO_BOOT=0` (default) → **NO se crean índices**
- Hay que ejecutar manualmente: `npm run db:ensure`
- O arrancar una vez con `MONGO_BOOT=1 npm run dev`

---

#### PASO 2.5: Registrar Plugins

**Líneas 50-53:**

```typescript
await app.register(requestId);
await app.register(corsPlugin);
await app.register(swaggerModule, { prefix: '/swagger' });
await app.register(healthRoutes, { prefix: '/health' });
await app.register(bearerAuth, { exemptPaths: ['/health', '/swagger'] });
```

**Orden de ejecución:**

1. **requestId**: Genera UUID para cada request
2. **CORS**: Valida orígenes (actualmente: `origin: true` = todos)
3. **Swagger**: Monta documentación en `/swagger`
4. **Health**: Endpoints de salud `/health` y `/health/db`
5. **BearerAuth**: Middleware de autenticación (si `AUTH_ENABLED=true`)

---

#### PASO 2.6: Registrar Rutas de Negocio

**Líneas 55-68:**

```typescript
const base = env.BASE_PATH.endsWith('/') ? env.BASE_PATH.slice(0, -1) : env.BASE_PATH;
await app.register(eventsRoutes, { prefix: base + '/events' });
await app.register(reservationsRoutes, { prefix: base + '/reservations' });
await app.register(productsRoutes, { prefix: base + '/products' });
// ... +10 módulos más
```

**Resultado:**

- ✅ Rutas montadas: `GET /api/events`, `POST /api/products`, etc.
- ✅ Cada módulo tiene su controller con CRUD completo

---

#### PASO 2.7: Configurar Hooks Globales

**Hook `onResponse` (líneas 70-80):**

```typescript
app.addHook('onResponse', async (req, reply) => {
	req.log.info(
		{
			statusCode: reply.statusCode,
			method: req.method,
			url: req.url,
			responseTime: reply.elapsedTime,
		},
		'request completed',
	);
});
```

**Propósito:** Logging de todas las requests completadas.

**Hook `onRoute` (líneas 82-89):**

```typescript
app.addHook('onRoute', (r) => {
	app.log.info(
		{
			method: r.method,
			url: r.url,
			routePrefix: (r as { prefix?: string }).prefix,
		},
		'ROUTE_ADDED',
	);
});
```

**Propósito:** Log de rutas registradas (útil en debug).

---

#### PASO 2.8: Configurar Handlers de Error

**NotFound Handler (líneas 91-94):**

```typescript
app.setNotFoundHandler((req, reply) => {
	req.log.warn({ url: req.url, method: req.method }, 'route not found');
	reply.code(404).send({ ok: false, error: 'Not Found' });
});
```

**Error Handler (líneas 96-104):**

```typescript
app.setErrorHandler((err, _req, reply) => {
	const status = (err as FastifyError).statusCode || 500;
	const payload =
		env.NODE_ENV === 'production'
			? { ok: false, error: err.message }
			: { ok: false, error: err.message, stack: err.stack };
	reply.code(status).send(payload);
});
```

**⚠️ PROBLEMA:** Expone stack traces en development (OK) pero en producción solo mensaje (mejor).

---

### 🔵 FASE 3: Levantar Servidor HTTP

**Archivo:** `src/server.ts:8-14`

```typescript
app.listen({ port: env.PORT, host: '0.0.0.0' })
	.then(() => {
		app.log.info(`Eventos API v2.0.0 on :${env.PORT}${env.BASE_PATH} (docs at /swagger)`);
	})
	.catch((err) => {
		app.log.error(err);
		process.exit(1);
	});
```

**Resultado:**

- ✅ Servidor escuchando en `0.0.0.0:3000` (o PORT configurado)
- ✅ Acepta conexiones de cualquier IP
- ✅ Log de arranque exitoso

---

## 2. ESTADO DE LAS COLECCIONES TRAS EL ARRANQUE

### Si `MONGO_BOOT=1` ✅

```javascript
// MongoDB después del arranque
db.getCollectionNames()
[
  'events',
  'reservations',
  'products',
  'promotions',
  'expenses',
  'salespeople',
  'paymentmethods',
  'cashiers',
  'stores',
  'units',
  'consumptiontypes',
  'payers',
  'pickuppoints',
  'partners'
]

// Todas están VACÍAS pero con índices
db.events.getIndexes()
[
  { v: 2, key: { _id: 1 }, name: '_id_' },  // Auto de MongoDB
  { v: 2, key: { date: 1 }, name: 'idx_events_date' },
  { v: 2, key: { name: 1 }, name: 'uniq_events_name', unique: true, collation: {...} }
]
```

### Si `MONGO_BOOT=0` ❌ (default)

```javascript
db.getCollectionNames()
[]  // ¡VACÍO! Las colecciones se crean al primer INSERT
```

**⚠️ PROBLEMA:** Sin índices, las queries serán lentas y no habrá constraints de unicidad.

---

## 3. VALIDACIONES - DÓNDE Y CUÁNDO

### 3.1 Validación en ENV (Arranque)

**Cuándo:** Al iniciar el servidor  
**Dónde:** `src/config/env.ts:8-17`  
**Qué valida:**

- Variables existen
- Tipos correctos (número, enum, boolean)
- Rangos válidos (PORT entre 1-65535)

**Ejemplo:**

```typescript
PORT: z.coerce.number().int().min(1).max(65535).default(3000);
```

**Si falla:** `process.exit(1)` con error detallado

---

### 3.2 Validación en Schemas Zod (Dominio)

**Cuándo:** Al llamar `Schema.parse(data)` en los controllers  
**Dónde:** `src/modules/*/schema.ts`

#### Ejemplo: Validación de Event

**Schema:** `src/modules/events/schema.ts`

```typescript
export const Event = SoftDelete.and(
	z.object({
		id: Id.optional(),
		name: z.string().min(1), // ✅ No vacío
		date: DateTime, // ✅ ISO 8601
		capacity: z.number().int().nonnegative().optional(), // ✅ Entero >= 0
		capitalAmount: Money.optional(), // ✅ Regex: "12345.67"
		createdAt: DateTime.optional(),
		updatedAt: DateTime.optional(),
	}),
);
```

**Schemas base:** `src/modules/catalogs/zod.schemas.ts`

```typescript
export const Id = z.string().min(1);
export const DateTime = z.string().datetime(); // ISO 8601
export const Money = z.string().regex(/^-?(0|[1-9]\d{0,4})\.\d{2}$/);
export const SoftDelete = z.object({ isActive: z.boolean().default(true) });
```

**Validaciones aplicadas:**

- ✅ `Id`: string no vacío
- ✅ `DateTime`: formato ISO 8601 (`2024-10-17T10:30:00Z`)
- ✅ `Money`: regex `"12345.67"` (hasta 5 dígitos enteros + 2 decimales)
- ✅ `SoftDelete`: boolean con default `true`

---

### 3.3 ¿DÓNDE SE LLAMA A `Schema.parse()`?

#### En los Controllers (mapIn / mapOut)

**Archivo:** `src/modules/events/routes.ts:8-10`

```typescript
const ctrl = makeController<EventT>(
	'events',
	(data) => Event.parse(data), // 🔴 VALIDACIÓN DE ENTRADA (mapIn)
	(doc) => {
		const { _id, ...rest } = doc;
		const base = { ...(rest as Record<string, unknown>), id: String(_id) };
		const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt']);
		return Event.parse(normalized); // 🔴 VALIDACIÓN DE SALIDA (mapOut)
	},
);
```

**¿Cuándo se ejecutan?**

1. **`mapIn` (entrada):**
    - En `POST /events` → `ctrl.create` → `repo.create(db, req.body)`
    - En `PUT /events/:id` → `ctrl.replace` → `repo.update(db, id, req.body)`
    - En `PATCH /events/:id` → `ctrl.patch` → `repo.patch(db, id, req.body)`

2. **`mapOut` (salida):**
    - En todas las operaciones que devuelven datos:
        - `GET /events` → `repo.list()`
        - `GET /events/:id` → `repo.getById()`
        - `POST /events` → `repo.create()`
        - `PUT /events/:id` → `repo.update()`
        - `PATCH /events/:id` → `repo.patch()`

**Flujo de validación en CREATE:**

```
1. Client envía: POST /api/events
   Body: { "name": "Fiesta 2025", "date": "2025-06-15T20:00:00Z" }

2. Controller recibe req.body

3. mapIn ejecuta: Event.parse(req.body)
   ✅ Valida: name no vacío, date en formato ISO
   ✅ Añade defaults: isActive = true
   ❌ Si falla: lanza ZodError

4. Si OK → se pasa a repo.create(db, validatedData)

5. Repo inserta en MongoDB:
   { name: "Fiesta 2025", date: ISODate(...), isActive: true, createdAt: now, updatedAt: now }

6. Repo devuelve documento insertado

7. mapOut ejecuta: Event.parse(documento)
   ✅ Transforma _id → id
   ✅ Normaliza fechas a ISO strings

8. Controller devuelve JSON al cliente
```

---

### 3.4 ¿Qué pasa si la validación Zod falla?

**Ejemplo:** Enviar `capacity: -5`

```typescript
POST /api/events
{
  "name": "Test",
  "date": "2025-06-15T20:00:00Z",
  "capacity": -5
}
```

**Resultado:**

```typescript
// Event.parse() lanza ZodError
ZodError: [
	{
		code: 'too_small',
		minimum: 0,
		type: 'number',
		inclusive: true,
		path: ['capacity'],
		message: 'Number must be greater than or equal to 0',
	},
];
```

**🔴 PROBLEMA ACTUAL:**

- El error **NO se captura específicamente**
- Fastify lo maneja como error genérico
- Cliente recibe: `500 Internal Server Error` (en vez de `400 Bad Request`)

**Solución:**

```typescript
// En error handler (app.ts)
app.setErrorHandler((err, req, reply) => {
	if (err instanceof ZodError) {
		return reply.code(400).send({
			code: 'VALIDATION_ERROR',
			errors: err.errors,
		});
	}
	// ... resto de errores
});
```

---

## 4. FLUJO COMPLETO DE UNA REQUEST

### Ejemplo: `POST /api/products`

```
📥 REQUEST
POST /api/products
Authorization: Bearer abc123
Content-Type: application/json

{
  "eventId": "507f1f77bcf86cd799439011",
  "name": "Cerveza",
  "stock": 100,
  "nominalPrice": "2.50"
}

─────────────────────────────────────────

🔄 CICLO DE PROCESAMIENTO

1️⃣ FASTIFY RECIBE REQUEST
   └─ Parsea body JSON

2️⃣ HOOK: requestId
   └─ Genera UUID: "req-12345-abcde"
   └─ Añade a req.id y logs

3️⃣ HOOK: CORS (preHandler)
   └─ Valida origin header
   └─ Si origin: true → ✅ ACEPTA TODOS (problema)

4️⃣ HOOK: bearerAuth (preHandler)
   └─ ¿AUTH_ENABLED=true?
      ├─ NO → continúa
      └─ SÍ → valida Bearer token
         ├─ ¿Token presente?
         │  ├─ NO → 401 Forbidden
         │  └─ SÍ → ⚠️ NO valida JWT (TODO)

5️⃣ ROUTE HANDLER: productsRoutes
   └─ Ejecuta: ctrl.create(req, reply)

6️⃣ CONTROLLER: makeController.create
   └─ Extrae: req.body
   └─ Extrae: req.server.db
   └─ Llama: repo.create(db, body)

7️⃣ VALIDACIÓN: mapIn
   └─ Product.parse(body)
   └─ ✅ Valida:
      - eventId: string no vacío
      - name: string no vacío
      - stock: number >= 0
      - nominalPrice: regex "2.50"
   └─ ✅ Añade defaults:
      - isActive: true
      - promotions: []

8️⃣ REPOSITORY: crud.create
   └─ Añade timestamps:
      - createdAt: new Date()
      - updatedAt: new Date()
   └─ Ejecuta: col.insertOne(doc)

9️⃣ MONGODB
   └─ Inserta documento
   └─ Valida índices:
      - uniq_products_eventId_name (case-insensitive)
      ├─ Si duplicado → MongoError E11000
      └─ Si OK → devuelve insertedId

🔟 REPOSITORY: fromDb
   └─ Ejecuta: col.findOne({ _id: insertedId })
   └─ Devuelve documento completo

1️⃣1️⃣ VALIDACIÓN: mapOut
   └─ Transforma: _id → id (string)
   └─ Normaliza fechas: Date → ISO string
   └─ Product.parse(normalized)
   └─ Devuelve: ProductT validado

1️⃣2️⃣ CONTROLLER
   └─ Devuelve: reply.code(201).send(product)

1️⃣3️⃣ HOOK: onResponse
   └─ Loguea:
      - statusCode: 201
      - method: POST
      - url: /api/products
      - responseTime: 45ms

📤 RESPONSE
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "507f1f77bcf86cd799439011",
  "eventId": "507f1f77bcf86cd799439011",
  "name": "Cerveza",
  "stock": 100,
  "nominalPrice": "2.50",
  "promotions": [],
  "isActive": true,
  "createdAt": "2024-10-17T10:30:00.000Z",
  "updatedAt": "2024-10-17T10:30:00.000Z"
}
```

---

## 5. GAPS DE VALIDACIÓN - LO QUE FALTA

### 5.1 ❌ NO hay validación en nivel de ruta

**Problema:**

- Fastify NO valida automáticamente con los schemas Zod
- La validación solo ocurre dentro del controller (tarde)

**Ejemplo:**

```typescript
// ACTUAL (sin validación de ruta)
app.post('/', ctrl.create);

// DEBERÍA SER
app.post(
	'/',
	{
		schema: {
			body: ProductSchema,
			response: { 201: ProductSchema },
		},
	},
	ctrl.create,
);
```

**Consecuencia:**

- Requests inválidas llegan al controller
- Se ejecuta lógica innecesaria antes de validar
- Errores no tienen código HTTP correcto (500 en vez de 400)

---

### 5.2 ❌ NO hay validación de ObjectId

**Problema:**

```typescript
GET / api / products / INVALID_ID;
```

**Qué pasa:**

1. Controller llama: `repo.getById(db, "INVALID_ID")`
2. Repository llama: `ensureObjectId("INVALID_ID")`
3. Lanza error: `"Invalid ObjectId: INVALID_ID"`
4. Error handler devuelve: `500 Internal Server Error`

**Debería:**

- Validar formato ObjectId en ruta
- Devolver `400 Bad Request` con mensaje claro

**Solución:**

```typescript
// En routes.ts
app.get(
	'/:id',
	{
		schema: {
			params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
		},
	},
	ctrl.get,
);
```

---

### 5.3 ❌ NO hay validación de integridad referencial

**Problema en `reservations.order`:**

```typescript
POST /api/reservations
{
  "eventId": "event123",
  "order": {
    "PRODUCTO_INEXISTENTE": 10,
    "PRODUCTO_DE_OTRO_EVENTO": 5
  }
}
```

**Qué pasa:**

- ✅ Schema Zod valida que `order` es un objeto
- ❌ NO valida que los productIds existan
- ❌ NO valida que sean del mismo eventId
- ✅ Se inserta en MongoDB SIN ERRORES

**Consecuencia:**

- Datos corruptos en BD
- Referencias rotas
- Imposible calcular totalAmount correctamente

**Solución:**

```typescript
// En ctrl.create de reservations
async create(req, reply) {
  const data = req.body;
  const db = req.server.db;

  // 1. Validar que todos los productIds existen
  const productIds = Object.keys(data.order);
  const products = await db.collection('products').find({
    _id: { $in: productIds.map(id => new ObjectId(id)) },
    eventId: new ObjectId(data.eventId),
    isActive: true
  }).toArray();

  if (products.length !== productIds.length) {
    return reply.code(400).send({
      code: 'INVALID_PRODUCTS',
      message: 'Algunos productos no existen o no pertenecen al evento'
    });
  }

  // 2. Continuar con creación normal
  const created = await repo.create(db, data);
  return reply.code(201).send(created);
}
```

---

### 5.4 ❌ NO hay validación de rangos de fechas

**Problema en `promotions`:**

```typescript
POST /api/promotions
{
  "startDate": "2025-12-31T23:59:59Z",
  "endDate": "2025-01-01T00:00:00Z"  // ← ANTES del start!
}
```

**Qué pasa:**

- ✅ Ambas fechas son ISO 8601 válidas
- ❌ NO valida que endDate > startDate
- ✅ Se inserta en MongoDB

**Consecuencia:**

- Promoción inválida nunca se aplicará
- Lógica de filtrado puede fallar

**Solución:**

```typescript
// En schema.ts
export const Promotion = z
	.object({
		// ... otros campos
		startDate: DateTime,
		endDate: DateTime,
	})
	.refine((data) => new Date(data.endDate) > new Date(data.startDate), {
		message: 'endDate must be after startDate',
		path: ['endDate'],
	});
```

---

### 5.5 ❌ NO hay validación de stock

**Problema:**

```typescript
POST /api/reservations
{
  "order": {
    "productId": 100  // ← Pide 100 unidades
  }
}

// Pero el producto tiene: { stock: 10 }
```

**Qué pasa:**

- ✅ Se crea la reserva
- ❌ NO se valida stock disponible
- ❌ NO se decrementa stock

**Consecuencia:**

- Sobreventa
- Stock negativo
- Inconsistencia

**Solución:**

- Implementar transacciones MongoDB
- Validar + decrementar stock atómicamente

---

### 5.6 ❌ NO hay validación de tipos enum

**Problema en `expenses.vatPct`:**

```typescript
POST /api/expenses
{
  "vatPct": "99"  // ← Valor no válido
}
```

**Schema actual:**

```typescript
// NO HAY validación de enum
vatPct: z.string();
```

**Debería ser:**

```typescript
vatPct: z.enum(['0', '4', '10', '21']);
```

---

### 5.7 ❌ NO hay validación de duplicados antes de insertar

**Problema:**

```typescript
POST /api/products
{
  "eventId": "event123",
  "name": "CERVEZA"  // Ya existe "cerveza" (case-insensitive)
}
```

**Qué pasa:**

1. Schema Zod valida OK
2. Repo intenta insertOne()
3. MongoDB rechaza por índice único: `uniq_products_eventId_name`
4. MongoError E11000: "duplicate key error"
5. Error handler devuelve: `500 Internal Server Error`

**Debería:**

- Capturar MongoError E11000
- Devolver `409 Conflict` con mensaje claro

**Solución:**

```typescript
// En error handler (app.ts)
app.setErrorHandler((err, req, reply) => {
	// Manejo de duplicados MongoDB
	if (err.name === 'MongoError' && err.code === 11000) {
		return reply.code(409).send({
			code: 'DUPLICATE_KEY',
			message: 'Ya existe un registro con ese valor único',
			field: Object.keys(err.keyPattern || {})[0],
		});
	}

	// ... resto de errores
});
```

---

### 5.8 ❌ NO hay sanitización de inputs

**Problema:** Inyección de operadores MongoDB

```typescript
POST /api/products
{
  "name": { "$gt": "" }  // ← Operador MongoDB inyectado
}
```

**Qué pasa:**

- Zod valida: `name: z.string().min(1)`
- ❌ `{ "$gt": "" }` NO es un string → falla validación
- ✅ Zod protege contra este caso

**PERO en queries:**

```typescript
GET /api/products?eventId[$ne]=null
```

**Problema:**

- Query params NO pasan por validación Zod
- Pueden contener operadores MongoDB

**Solución:**

```typescript
// En pagination.ts o middleware
function sanitizeQuery(query: any): any {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(query)) {
    // Rechazar keys que empiecen con $
    if (key.startsWith(')) continue;

    // Rechazar valores que sean objetos con operadores
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      if (keys.some(k => k.startsWith('))) continue;
    }

    sanitized[key] = value;
  }
  return sanitized;
}
```

---

## 6. RESUMEN DE VALIDACIONES

### ✅ VALIDACIONES QUE SÍ EXISTEN

| Tipo                 | Dónde                      | Cuándo                        | Qué valida                     |
| -------------------- | -------------------------- | ----------------------------- | ------------------------------ |
| **Variables ENV**    | `config/env.ts`            | Arranque                      | Tipos, rangos, obligatorias    |
| **Schemas Zod**      | `modules/*/schema.ts`      | En controllers (mapIn/mapOut) | Tipos, formatos, ranges        |
| **Índices únicos**   | MongoDB                    | Al insertar/actualizar        | Duplicados por (eventId, name) |
| **ObjectId format**  | `crud.ts:ensureObjectId()` | En repo                       | Formato válido de ObjectId     |
| **Formato Money**    | Regex en Zod               | En parse()                    | `"12345.67"` (2 decimales)     |
| **Formato DateTime** | Zod datetime()             | En parse()                    | ISO 8601 válido                |
| **Soft delete**      | `crud.ts`                  | En repo                       | Añade `isActive: true`         |

### ❌ VALIDACIONES QUE FALTAN

| Tipo                       | Problema                         | Impacto                   | Prioridad  |
| -------------------------- | -------------------------------- | ------------------------- | ---------- |
| **Validación en rutas**    | No usa fastify schemas           | Errors 500 en vez de 400  | 🔴 ALTA    |
| **ObjectId en params**     | No valida formato en `:id`       | Crashes con IDs inválidos | 🔴 ALTA    |
| **Integridad referencial** | `order` map sin validar FKs      | Datos corruptos           | 🔴 CRÍTICA |
| **Rangos de fechas**       | startDate > endDate permitido    | Lógica rota               | 🟡 MEDIA   |
| **Stock disponible**       | No valida antes de reservar      | Sobreventa                | 🔴 CRÍTICA |
| **Enums explícitos**       | `vatPct` acepta cualquier string | Datos inválidos           | 🟡 MEDIA   |
| **Manejo de E11000**       | Error 500 en vez de 409          | UX pobre                  | 🟡 MEDIA   |
| **Sanitización queries**   | Operadores MongoDB inyectables   | Seguridad                 | 🔴 ALTA    |
| **Validación de permisos** | No valida ownership de recursos  | Seguridad                 | 🔴 CRÍTICA |
| **Rate limiting**          | No existe                        | DoS                       | 🟡 MEDIA   |

---

## 7. DIAGRAMA DE FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                    ARRANQUE DEL SERVIDOR                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  getEnv()       │
                    │  Valida .env    │
                    │  con Zod        │
                    └────────┬────────┘
                             │ ✅ OK / ❌ exit(1)
                             ▼
                    ┌─────────────────┐
                    │ MongoClient     │
                    │ .connect()      │
                    └────────┬────────┘
                             │ ✅ Connected
                             ▼
                    ┌─────────────────┐
                    │ Fastify({       │
                    │   logger...     │
                    │ })              │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ MONGO_BOOT=1?            │
              └──────────┬───────────────┘
                    YES  │  NO
              ┌──────────┴───────────┐
              ▼                      ▼
    ┌──────────────────┐    ┌────────────────┐
    │ ensureMongoArtif│    │ Skip artifacts │
    │ - Crea 13+ cols │    │ (manual later) │
    │ - Crea 37+ idx  │    └────────────────┘
    └──────────┬───────┘
               │ ✅ Artifacts created
               ▼
    ┌──────────────────────┐
    │ Register Plugins:    │
    │ - requestId          │
    │ - CORS              │
    │ - Swagger           │
    │ - Health            │
    │ - BearerAuth        │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Register Routes:     │
    │ - /api/events       │
    │ - /api/products     │
    │ - /api/reservations │
    │ - ... +10 módulos   │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Configure Hooks:     │
    │ - onResponse (log)  │
    │ - onRoute (debug)   │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Error Handlers:      │
    │ - 404 NotFound      │
    │ - 500 Error         │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ app.listen(PORT)    │
    │ ✅ Server ready!     │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PROCESAMIENTO DE UNA REQUEST                   │
└─────────────────────────────────────────────────────────────┘

    📥 POST /api/products
       Body: { eventId, name, stock, nominalPrice }
              │
              ▼
    ┌──────────────────────┐
    │ 1. requestId plugin │
    │    Genera UUID      │
    └──────────┬───────────┘
               ▼
    ┌──────────────────────┐
    │ 2. CORS plugin      │
    │    ✅ origin: true   │ ⚠️ ACEPTA TODOS
    └──────────┬───────────┘
               ▼
    ┌──────────────────────┐
    │ 3. bearerAuth       │
    │    ¿AUTH_ENABLED?   │
    └──────────┬───────────┘
          YES  │  NO
    ┌──────────┴───────────┐
    ▼                      ▼
┌─────────┐         ┌──────────┐
│ ¿Token? │         │ Continue │
└────┬────┘         └──────────┘
  NO │  YES ⚠️ NO valida JWT
     │
401 ←┘
               │
               ▼
    ┌──────────────────────┐
    │ 4. Route handler    │
    │    ctrl.create()    │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ 5. mapIn            │
    │    Product.parse()  │ 🔍 ZOD VALIDACIÓN
    └──────────┬───────────┘
          ✅   │   ❌
    ┌──────────┴───────────┐
    ▼                      ▼
┌─────────┐         ┌──────────┐
│Continue │         │ ZodError │
└────┬────┘         └────┬─────┘
     │                   │
     │                   ▼
     │              500 Internal ⚠️ DEBERÍA SER 400
     │
     ▼
┌──────────────────────┐
│ 6. repo.create()    │
│    - Add timestamps │
│    - Add isActive   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 7. MongoDB          │
│    insertOne()      │
└──────────┬───────────┘
      ✅   │   ❌
┌──────────┴───────────┐
▼                      ▼
┌─────────┐     ┌──────────────┐
│ Insert  │     │ E11000 Dup  │
│ success │     │ key error   │
└────┬────┘     └──────┬───────┘
     │                 │
     │                 ▼
     │            500 Internal ⚠️ DEBERÍA SER 409
     │
     ▼
┌──────────────────────┐
│ 8. findOne()        │
│    Get inserted doc │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 9. mapOut           │
│    - _id → id       │
│    - Date → ISO     │
│    Product.parse()  │ 🔍 ZOD VALIDACIÓN
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 10. reply.code(201) │
│     .send(product)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 11. onResponse hook │
│     Log completed   │
└──────────┬───────────┘
           │
           ▼
    📤 201 Created
       { id, eventId, name, stock, ... }
```

---

## 8. CÓDIGO DE EJEMPLO: MEJORAS PROPUESTAS

### 8.1 Error Handler Mejorado

```typescript
// src/app.ts - MEJORADO
import { ZodError } from 'zod';

app.setErrorHandler((err, req, reply) => {
	// 1. Errores de validación Zod
	if (err instanceof ZodError) {
		return reply.code(400).send({
			code: 'VALIDATION_ERROR',
			message: 'Datos inválidos',
			errors: err.errors.map((e) => ({
				field: e.path.join('.'),
				message: e.message,
			})),
		});
	}

	// 2. Errores de duplicado MongoDB
	if (err.name === 'MongoServerError' && err.code === 11000) {
		const field = Object.keys(err.keyPattern || {})[0];
		return reply.code(409).send({
			code: 'DUPLICATE_KEY',
			message: `Ya existe un registro con ese ${field}`,
			field,
		});
	}

	// 3. Errores de ObjectId inválido
	if (err.message?.includes('Invalid ObjectId')) {
		return reply.code(400).send({
			code: 'INVALID_ID',
			message: 'ID inválido',
		});
	}

	// 4. Errores de Fastify (400, 401, 404...)
	if ((err as FastifyError).statusCode) {
		const status = (err as FastifyError).statusCode;
		return reply.code(status).send({
			code: err.name,
			message: err.message,
		});
	}

	// 5. Errores genéricos (500)
	req.log.error({ err, url: req.url, method: req.method }, 'Unhandled error');

	const payload =
		env.NODE_ENV === 'production'
			? { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' }
			: { code: 'INTERNAL_ERROR', message: err.message, stack: err.stack };

	return reply.code(500).send(payload);
});
```

---

### 8.2 Validación en Rutas con Fastify + Zod

```typescript
// src/modules/products/routes.ts - MEJORADO
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Product, ProductT } from './schema';

// Schema para params
const ParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido')
});

// Schema para query (list)
const QuerySchema = z.object({
  eventId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  after: z.string().regex(/^[a-f\d]{24}$/i).optional()
});

export default async function productsRoutes(app: FastifyInstance) {
  const ctrl = makeController<ProductT>('products', ...);

  // GET / - Con validación de query
  app.get('/', {
    schema: {
      querystring: QuerySchema,
      response: {
        200: z.object({
          items: z.array(Product),
          page: z.object({
            limit: z.number(),
            nextCursor: z.string().nullable(),
            total: z.number()
          })
        })
      }
    },
    // Fastify auto-valida y serializa
  }, ctrl.list);

  // GET /:id - Con validación de params
  app.get('/:id', {
    schema: {
      params: ParamsSchema,
      response: {
        200: Product,
        404: z.object({
          code: z.literal('NOT_FOUND'),
          message: z.string()
        })
      }
    }
  }, ctrl.get);

  // POST / - Con validación de body
  app.post('/', {
    schema: {
      body: Product.omit({ id: true, createdAt: true, updatedAt: true }),
      response: {
        201: Product
      }
    }
  }, ctrl.create);

  // PUT /:id - Con validación completa
  app.put('/:id', {
    schema: {
      params: ParamsSchema,
      body: Product.omit({ id: true, createdAt: true, updatedAt: true }),
      response: {
        200: Product
      }
    }
  }, ctrl.replace);

  // PATCH /:id - Con validación parcial
  app.patch('/:id', {
    schema: {
      params: ParamsSchema,
      body: Product.partial().omit({ id: true, createdAt: true, updatedAt: true }),
      response: {
        200: Product
      }
    }
  }, ctrl.patch);

  // DELETE /:id
  app.delete('/:id', {
    schema: {
      params: ParamsSchema,
      response: {
        204: z.null()
      }
    }
  }, ctrl.remove);
}
```

**⚠️ NOTA:** Para usar Zod con Fastify schemas necesitas:

```bash
pnpm add fastify-type-provider-zod
```

```typescript
// En app.ts
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

const app = Fastify({...});
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
```

---

### 8.3 Validación de Integridad Referencial

```typescript
// src/modules/reservations/routes.ts - MEJORADO
import { ObjectId } from 'mongodb';

// Controller custom para reservations
async function createReservation(req: FastifyRequest, reply: FastifyReply) {
	const db = (req.server as any).db;
	const data = req.body as ReservationCreate;

	// 1. Validar que el evento existe
	const event = await db.collection('events').findOne({
		_id: new ObjectId(data.eventId),
		isActive: true,
	});

	if (!event) {
		return reply.code(404).send({
			code: 'EVENT_NOT_FOUND',
			message: 'Evento no encontrado',
		});
	}

	// 2. Validar que todos los productos existen y son del evento
	const productIds = Object.keys(data.order);
	const products = await db
		.collection('products')
		.find({
			_id: { $in: productIds.map((id) => new ObjectId(id)) },
			eventId: new ObjectId(data.eventId),
			isActive: true,
		})
		.toArray();

	if (products.length !== productIds.length) {
		const foundIds = products.map((p) => p._id.toString());
		const missing = productIds.filter((id) => !foundIds.includes(id));

		return reply.code(400).send({
			code: 'INVALID_PRODUCTS',
			message: 'Algunos productos no existen o no pertenecen al evento',
			missingIds: missing,
		});
	}

	// 3. Validar stock disponible
	for (const [productId, qty] of Object.entries(data.order)) {
		const product = products.find((p) => p._id.toString() === productId);
		if (product && product.stock < qty) {
			return reply.code(400).send({
				code: 'INSUFFICIENT_STOCK',
				message: `Stock insuficiente para ${product.name}`,
				productId,
				available: product.stock,
				requested: qty,
			});
		}
	}

	// 4. Validar catálogos (salesperson, paymentMethod, etc.)
	const [salesperson, paymentMethod, consumptionType] = await Promise.all([
		db.collection('salespeople').findOne({
			_id: new ObjectId(data.salespersonId),
			eventId: new ObjectId(data.eventId),
			isActive: true,
		}),
		db.collection('paymentmethods').findOne({
			_id: new ObjectId(data.paymentMethodId),
			eventId: new ObjectId(data.eventId),
			isActive: true,
		}),
		db.collection('consumptiontypes').findOne({
			_id: new ObjectId(data.consumptionTypeId),
			eventId: new ObjectId(data.eventId),
			isActive: true,
		}),
	]);

	if (!salesperson || !paymentMethod || !consumptionType) {
		return reply.code(400).send({
			code: 'INVALID_REFERENCES',
			message: 'Referencias inválidas a catálogos',
		});
	}

	// 5. Calcular totalAmount con promociones
	const totalAmount = await calculateTotalWithPromotions(
		db,
		data.eventId,
		data.order,
		data.consumptionTypeId,
		products,
	);

	// 6. Crear reserva dentro de transacción (decrementar stock)
	const session = db.client.startSession();
	try {
		await session.withTransaction(async () => {
			// Decrementar stock de cada producto
			for (const [productId, qty] of Object.entries(data.order)) {
				await db
					.collection('products')
					.updateOne(
						{ _id: new ObjectId(productId) },
						{ $inc: { stock: -qty } },
						{ session },
					);
			}

			// Insertar reserva
			const reservation = {
				...data,
				totalAmount: totalAmount.toString(),
				hasPromoApplied: totalAmount.hasPromoApplied,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = await db.collection('reservations').insertOne(reservation, { session });
			return result.insertedId;
		});

		return reply.code(201).send({ id: insertedId.toString() });
	} catch (err) {
		req.log.error({ err }, 'Transaction failed');
		return reply.code(500).send({
			code: 'TRANSACTION_FAILED',
			message: 'Error al crear reserva',
		});
	} finally {
		await session.endSession();
	}
}
```

---

### 8.4 Función de Cálculo de Precio con Promociones

```typescript
// src/modules/reservations/pricing.ts
import { Db, ObjectId } from 'mongodb';

interface PricingResult {
	total: number;
	hasPromoApplied: boolean;
	breakdown: {
		productId: string;
		quantity: number;
		basePrice: number;
		supplement: number;
		discount: number;
		subtotal: number;
	}[];
}

export async function calculateTotalWithPromotions(
	db: Db,
	eventId: string,
	order: Record<string, number>,
	consumptionTypeId: string,
	products: any[],
): Promise<PricingResult> {
	const now = new Date();
	let hasPromoApplied = false;
	const breakdown = [];

	// 1. Obtener promociones vigentes del evento
	const promotions = await db
		.collection('promotions')
		.find({
			eventId: new ObjectId(eventId),
			isActive: true,
			startDate: { $lte: now },
			endDate: { $gte: now },
		})
		.sort({ priority: -1 })
		.toArray();

	// 2. Calcular precio por producto
	for (const [productId, qty] of Object.entries(order)) {
		const product = products.find((p) => p._id.toString() === productId);
		if (!product) continue;

		// Precio base
		const basePrice = parseFloat(product.nominalPrice || '0');

		// Suplemento por tipo de consumo
		const supplement = product.supplement?.[consumptionTypeId] || 0;

		// Precio unitario antes de descuento
		const unitPrice = basePrice + supplement;

		// Aplicar promociones
		let discount = 0;
		for (const promo of promotions) {
			if (!promo.applicables.includes(productId)) continue;

			const promoDiscount = applyPromoRule(promo, qty, unitPrice);
			if (promoDiscount > 0) {
				discount += promoDiscount;
				hasPromoApplied = true;
				if (!promo.isCumulative) break; // No aplicar más promos
			}
		}

		const subtotal = unitPrice * qty - discount;

		breakdown.push({
			productId,
			quantity: qty,
			basePrice,
			supplement,
			discount,
			subtotal,
		});
	}

	const total = breakdown.reduce((sum, item) => sum + item.subtotal, 0);

	return { total, hasPromoApplied, breakdown };
}

function applyPromoRule(promo: any, qty: number, unitPrice: number): number {
	switch (promo.rule) {
		case 'XForY':
			// 3x2: Cada 3 unidades, pagas 2
			const { buy, pay } = promo.conditions;
			const sets = Math.floor(qty / buy);
			const free = sets * (buy - pay);
			return free * unitPrice;

		case 'PercentageDiscount':
			// -20%
			const { percentage } = promo.conditions;
			return (unitPrice * qty * percentage) / 100;

		case 'DiscountPerUnit':
			// -1€ por unidad
			const { amountPerUnit } = promo.conditions;
			return amountPerUnit * qty;

		// ... más reglas

		default:
			return 0;
	}
}
```

---

## 9. CHECKLIST DE VALIDACIONES A IMPLEMENTAR

### 🔴 CRÍTICAS (Implementar YA)

- [ ] **Validación de integridad referencial en `reservations.order`**
    - Verificar que productIds existen
    - Verificar que son del mismo eventId
    - Verificar stock disponible

- [ ] **Transacciones para decrementar stock**
    - Usar `session.withTransaction()`
    - Atomic: validar + decrementar + insertar

- [ ] **Validación JWT real en bearerAuth**
    - Implementar `jwt.verify()`
    - No aceptar cualquier string como token

- [ ] **Validación de ownership**
    - Usuario solo puede modificar sus recursos
    - Añadir campo `userId` a documentos

### 🟡 ALTAS (Implementar pronto)

- [ ] **Schemas Zod en rutas Fastify**
    - Instalar `fastify-type-provider-zod`
    - Añadir `schema: { body, params, querystring }` en todas las rutas

- [ ] **Error handler mejorado**
    - Capturar `ZodError` → 400
    - Capturar `MongoError E11000` → 409
    - Capturar `Invalid ObjectId` → 400

- [ ] **Sanitización de query params**
    - Rechazar operadores MongoDB (`$ne`, `$gt`, etc.)
    - Validar tipos antes de pasar a repository

- [ ] **Validación de rangos de fechas**
    - `endDate > startDate` en promociones
    - Usar `.refine()` en Zod

### 🟢 MEDIAS (Mejorar gradualmente)

- [ ] **Enums explícitos**
    - `vatPct: z.enum(['0', '4', '10', '21'])`
    - `rule: z.enum([...Rules])`

- [ ] **Validación de permisos por rol**
    - Admin puede todo
    - Vendedor solo sus reservas
    - Cajero solo cobros

- [ ] **Rate limiting**
    - `@fastify/rate-limit`
    - 100 req/min por IP

- [ ] **Validación de tamaños de payload**
    - Limitar body a 1MB
    - Limitar arrays a 100 items

---

## 10. CONCLUSIONES

### ✅ LO QUE ESTÁ BIEN

1. **Validación de ENV robusta** con Zod
2. **Schemas Zod bien definidos** (tipos, formatos)
3. **Índices únicos** protegen duplicados
4. **Soft delete consistente**
5. **Timestamps automáticos**

### ⚠️ LO QUE FALTA (GAPS CRÍTICOS)

1. **NO hay validación a nivel de ruta** (todo llega al controller)
2. **NO hay validación de integridad referencial** (FKs no se validan)
3. **NO hay control de stock** (sobreventa posible)
4. **NO hay validación JWT** (cualquier token sirve)
5. **Errores mal tipados** (500 en vez de 400/409)

### 🎯 RECOMENDACIÓN PRIORITARIA

**Implementar EN ESTE ORDEN:**

1. **Validación de integridad referencial** (crítico para datos)
2. **Error handler mejorado** (mejor UX)
3. **Schemas en rutas Fastify** (validación temprana)
4. **Validación JWT** (seguridad)
5. **Control de stock con transacciones** (negocio crítico)

---
