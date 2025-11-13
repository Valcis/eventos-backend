# EVENTOS – Backend Fastify + Mongo

Este repositorio implementa un backend en **TypeScript estricto** con **Fastify** y **MongoDB**.

## TL;DR

```bash
# 1) Configura variables de entorno
# Crea un archivo .env con las variables requeridas (ver docs/env.md)
# 2) Arranque en dev (tsx + watch)
npm run dev
# 3) Arranque en prod (compila a dist y ejecuta)
npm run build && npm start
# 4) Swagger UI
open http://localhost:3000/swagger
```

> **Nota:** A partir de esta versión, `tsconfig.json` **sí emite** a `dist/`.

---

## Requisitos

- Node.js >= 20.0.0
- npm
- MongoDB (local o remoto)

## Variables de entorno (resumen)

Consulta **docs/env.md** para detalle completo. Variables principales:

- `MONGO_URL` - Conexión MongoDB (requerido)
- `MONGODB_DB` - Nombre de base de datos (requerido)
- `NODE_ENV` - `development` | `production` | `test`
- `PORT` - Puerto del servidor (default: 3000)
- `BASE_PATH` - Prefijo API (default: `/api`)
- `MONGO_BOOT` - `0` | `1` - Crear índices en arranque
- `AUTH_ENABLED` - Habilitar autenticación Bearer Token
- `JWT_SECRET` - Secret para JWT (requerido si AUTH_ENABLED=true)
- `LOG_LEVEL` - `debug` | `info` | `warn` | `error`

## Arquitectura

- **Fastify** con plugins: CORS, Swagger, Rate Limiting, Bearer Auth, Request ID, Logging
- **MongoDB**: Conexión singleton, índices automáticos, soft delete pattern
- **Módulos**: `events`, `reservations`, `expenses`, `products`, `promotions`, y catálogos
- **Paginación**: Cursor-based (no offset), sorting dinámico
- **Factory patterns**: Generic CRUD y Controllers para minimizar boilerplate

Más info en **docs/architecture.md** y **docs/data-model.md**.

## Contratos API

- Envelope uniforme en respuestas: **`{ ok, data, page? }`** (éxito) o **`{ ok, statusCode, code, error, message }`** (error)
- `POST` de todas las entidades devuelve **`{ ok: true, data: { id, ... } }`**
- Esquemas y ejemplos en **docs/api.md** y Swagger (`/swagger`)

## Desarrollo

```bash
npm install
npm run dev
# Lint & typecheck
npm run check:lint
```

## Producción

```bash
npm run build
npm start
```

- `build` compila TypeScript a `dist/`
- `start` ejecuta `node dist/server.js`

## Salud y utilidades

- `GET /health` - Health check básico
- `npm run check:mongo` - Verificar conexión MongoDB
- `npm run db:ensure` - Crear índices manualmente
- `npm run seed` - Poblar base de datos de prueba
- `npm run generate-jwt` - Generar token JWT para testing
- `MONGO_BOOT=1` para crear índices automáticamente en arranque

## Contribución

Resumen de convenciones:

- Sin `any`, tipado estricto TypeScript
- Boolean props con prefijo `is*` (ej: `isActive`, `isPaid`)
- No usar `.js` en imports TypeScript
- Documentar cambios en `docs/` cuando modifiques contratos
- Actualizar schemas Swagger/OpenAPI

## Seguridad

- CORS configurable por entorno
- Rate limiting activo (100 req/min)
- Bearer Token authentication con JWT
- Sanitización automática de logs (tokens, passwords)
- Soft delete pattern en todas las colecciones

Ver **docs/security.md** para detalles.

## Herramientas de desarrollo

- ESLint + Prettier configurados
- TypeScript strict mode
- Pino logger con request ID tracking
- Swagger UI en `/swagger`
- Scripts de utilidad para MongoDB

---

© EVENTOS
