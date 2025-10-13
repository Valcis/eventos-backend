# Plan de cierre — Eventos Backend

> Estado actual: **Swagger en /docs OK**, estructura híbrida establecida. Pendiente cerrar pulidos de seguridad, DX y tipados.

## 1) Código y estructura

- [ ] **Infra / Shared**
    - [ ] Mover `makeCrud` a `src/infra/mongo/crud.ts` (si no está ya).
    - [ ] Verificar que los repos de dominio sólo importan de `infra/*` y `shared/*`.
- [ ] **Tipados en rutas**
    - [ ] Declarar `Params`, `Querystring`, `Body` en cada endpoint Fastify (sin `any`).
    - [ ] Decorador tipado para `app.db` y `req.db` (evitar casts).
- [ ] **Errores unificados**
    - [ ] `core/errors/http-error.ts` (clases/mapper) + `middlewares/error.ts` (handler global).
    - [ ] Todas las ramas 4xx/5xx devuelven `{ code, message, details? }` homogéneo.

## 2) Seguridad de API

- [ ] **CORS / Helmet**
    - [ ] `plugins/cors.ts` + `plugins/helmet.ts` configurados por entorno (allowlist).
    - [ ] `curl -I` muestra headers de seguridad + CORS correcto.
- [ ] **Rate limit**
    - [ ] `@fastify/rate-limit` (p.ej. 100 req/min/IP) excluyendo `/health` y `/docs`.
    - [ ] Respuestas 429 con cuerpo JSON consistente.

## 3) Observabilidad

- [ ] **Logging**
    - [ ] `core/logging/logger.ts` + hook `requestId`.
    - [ ] Serializadores (ocultar tokens/headers sensibles).
    - [ ] Cada log incluye `requestId` y nivel.
- [ ] **Tracing (opcional)**
    - [ ] OpenTelemetry básico (HTTP + Mongo) si aporta.

## 4) Datos y Mongo

- [ ] **Índices**
    - [ ] Revisar y crear índices por colección (paginación por `_id`, `isActive`, filtros típicos).
    - [ ] `ensureMongoArtifacts()` y script `db:ensure` verdes en frío.
- [ ] **Ciclo de vida**
    - [ ] Conexión única y **graceful shutdown** (SIGINT/SIGTERM).

## 5) OpenAPI / Swagger

- [ ] **YAML completo**
    - [ ] `servers: http://localhost:3000/api`
    - [ ] `components.securitySchemes.bearerAuth` + `security: [{ bearerAuth: [] }]`
    - [ ] Schemas por recurso (alineados con Zod/DTOs).
- [ ] **Fuente de verdad (opcional)**
    - [ ] Zod → OpenAPI (zod-to-openapi) para evitar drift.

## 6) DX / CI

- [ ] **Lockfile**
    - [ ] Commitear `pnpm-lock.yaml` (o gestor único).
- [ ] **Scripts**
    - [ ] `"check": "tsc -p tsconfig.json --noEmit && eslint . && prettier -c ."`
    - [ ] `"db:ensure": "tsx src/tools/db-ensure.ts"`
- [ ] **CI mínima**
    - [ ] Workflow con `pnpm i`, `pnpm check`, `pnpm test` (si hay tests).

## 7) Runtime / Build

- [ ] **Build prod**
    - [ ] Compilar a `dist/` (tsc/tsup).
    - [ ] Copiar `openapi.yaml` al artefacto o resolver por `OPENAPI_PATH`.
    - [ ] `NODE_ENV=production node dist/server.js` levanta `/docs`.
- [ ] **Config**
    - [ ] `.env.example` actualizado y `config/env.ts` con Zod (fallo rápido si faltan vars).

## 8) Endpoints base

- [ ] **Health**
    - [ ] `/health/live` y `/health/ready` (exentos de auth).
- [ ] **Base path**
    - [ ] Módulos registrados bajo `env.BASE_PATH` (p. ej. `/api`).

---

### Snippets útiles

**Decorador tipado de DB**

```ts
// types/fastify.d.ts
import 'fastify';
import type { Db } from 'mongodb';
declare module 'fastify' {
	interface FastifyInstance {
		db: Db;
	}
	interface FastifyRequest {
		db: Db;
	}
}
```

**Handler de errores base**

```ts
// middlewares/error.ts
import type { FastifyError, FastifyInstance } from 'fastify';

export default async function errorHandler(app: FastifyInstance) {
	app.setErrorHandler((err, _req, reply) => {
		const status = (err as any).status ?? 500;
		const payload = {
			code: err.code ?? 'ERROR',
			message: err.message ?? 'Internal Error',
			details: (err as any).details,
		};
		reply.code(status).send(payload);
	});
}
```

**Rate limit**

```ts
// plugins/rate-limit.ts
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
export default fp(async (app) => {
	await app.register(rateLimit, {
		max: 100,
		timeWindow: '1 minute',
		skipOnError: true,
		allowList: [/^127\.0\.0\.1$/],
	});
});
```

**Registro de prefijos visibles (app.ts)**

```ts
const API = env.BASE_PATH; // '/api'
const DOCS_PREFIX = '/docs';

await app.register(bearerPlugin, { exemptPaths: ['/health', DOCS_PREFIX] });
await app.register(swaggerModule, { prefix: DOCS_PREFIX });

// módulos de dominio
await app.register(eventsRoutes, { prefix: API + '/events' });
await app.register(reservationsRoutes, { prefix: API + '/reservations' });
// ...
```

---

### Criterios de “hecho” global

- `pnpm check` verde (types + lint + prettier).
- Smoke tests:
    - `GET /health/ready` → 200
    - `GET /docs` y `GET /docs/json` → OK
    - Ruta privada sin token → 401; con bearer → 200
- `db:ensure` idempotente.
- Build de producción levanta `/docs` sin tocar rutas.
