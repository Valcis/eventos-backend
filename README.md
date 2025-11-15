# EVENTOS – Backend Fastify + MongoDB

Backend en **TypeScript estricto** para gestión de eventos multi-tenant con **Fastify** y **MongoDB**.

## ✨ Características Destacadas

- 🔐 **Autenticación dual**: JWT local (email/password) o Auth0 OAuth (Google, Instagram, Facebook)
- 📊 **Multi-tenant**: Datos particionados por evento con soft delete pattern
- 🚀 **Factory patterns**: Generic CRUD y Controllers para mínimo boilerplate
- 📖 **OpenAPI dinámico**: Generado desde Zod schemas, disponible en `/swagger`
- 🔒 **Seguridad completa**: Rate limiting, CORS, input validation, MongoDB operator protection
- 📝 **Logging robusto**: Pino con niveles numéricos, rotación diaria, redacción de datos sensibles
- 🔄 **Transacciones**: Stock operations atómicas con MongoDB transactions
- ✅ **Validación estricta**: Zod schemas con mensajes en español, referential integrity

## 🚀 Quick Start

```bash
# 1) Instalar dependencias
npm install

# 2) Configurar variables de entorno
# Crea .env con MONGO_URL y MONGODB_DB (ver docs/env.md)

# 3) Desarrollo con hot-reload
npm run dev

# 4) Abrir Swagger UI
open http://localhost:3000/swagger

# 5) Producción
npm run build && npm start
```

---

## Requisitos

- Node.js >= 20.0.0
- npm
- MongoDB (local o remoto)

## Variables de entorno (resumen)

Consulta **docs/env.md** para detalle completo. Variables principales:

**Requeridas:**
- `MONGO_URL` - Conexión MongoDB
- `MONGODB_DB` - Nombre de base de datos

**Opcionales:**
- `NODE_ENV` - `development` | `production` | `test` (default: `development`)
- `PORT` - Puerto del servidor (default: `3000`)
- `BASE_PATH` - Prefijo API (default: `/api`)
- `MONGO_BOOT` - `0` | `1` - Crear índices en arranque

**Autenticación (local JWT):**
- `AUTH_ENABLED` - Habilitar autenticación JWT local (default: `false`)
- `JWT_SECRET` - Secret para JWT (requerido si `AUTH_ENABLED=true`, min 32 chars)
- `JWT_ALGORITHM` - Algoritmo JWT: HS256, HS384, HS512, RS256... (default: `HS256`)
- `JWT_EXPIRES_IN` - Expiración del token (default: `24h`)

**Autenticación (Auth0 OAuth):**
- `AUTH0_ENABLED` - Habilitar Auth0 OAuth social (default: `false`)
- `AUTH0_DOMAIN` - Dominio Auth0 (requerido si `AUTH0_ENABLED=true`)
- `AUTH0_AUDIENCE` - Audience Auth0 (requerido si `AUTH0_ENABLED=true`)

**Seguridad:**
- `CORS_ORIGINS` - Orígenes CORS permitidos (separados por comas)
- `RATE_LIMIT_MAX` - Max requests por ventana (default: `100`)
- `RATE_LIMIT_WINDOW` - Ventana de tiempo (default: `1 minute`)

**Observabilidad:**
- `LOG_LEVEL` - `trace` | `debug` | `info` | `warn` | `error` | `fatal` (default: `info`)
- `SWAGGER_ENABLED` - Habilitar Swagger UI (default: `true`)

## Arquitectura

**Stack:**
- **Fastify** con plugins: CORS, Swagger, Rate Limiting, Request ID
- **MongoDB**: Conexión singleton, índices automáticos, soft delete pattern, transacciones
- **TypeScript estricto**: Validación con Zod, mensajes de error en español
- **Pino logger**: Niveles numéricos (30=info, 50=error), archivo único con rotación diaria

**Funcionalidades:**
- **Autenticación dual**: JWT local (email/password) o Auth0 OAuth (Google, Instagram, Facebook)
- **Módulos**: `events`, `reservations`, `expenses`, `products`, `promotions`, `users`, y catálogos
- **Paginación**: Cursor-based (no offset), sorting dinámico
- **Factory patterns**: Generic CRUD y Controllers para minimizar boilerplate
- **Validación completa**: Referencial integrity, MongoDB operator injection protection, input sanitization

Más info en **docs/overview.md**, **docs/data-model.md** y **docs/security.md**.

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

- **Autenticación dual**: JWT local con validación completa o Auth0 OAuth social
- **Rate limiting**: 100 req/min por IP (configurable, localhost allowlisted)
- **CORS**: Configurable por entorno, orígenes específicos o wildcard
- **Input validation**: Zod schemas con mensajes en español, referential integrity
- **MongoDB protection**: Sanitización de operadores peligrosos ($where, $regex, etc.)
- **Logging seguro**: Redacción automática de tokens, passwords, headers sensibles
- **Soft delete**: Patrón `isActive` en todas las colecciones
- **Transacciones**: Stock operations atómicas con MongoDB transactions

Ver **docs/security.md** y **docs/error-codes.md** para detalles.

## Herramientas de desarrollo

- **Linting**: ESLint + Prettier configurados (`npm run lint`, `npm run format`)
- **TypeScript**: Strict mode con `noImplicitAny`, `noUncheckedIndexedAccess`
- **Testing**: Vitest configurado con coverage (`npm test`, `npm run test:coverage`)
- **Logging**: Pino con request ID tracking, niveles numéricos, rotación diaria
  - Consola: logs limpios (desarrollo)
  - Archivo: `logs/app-YYYY-MM-DD.log` con todos los detalles (JSON)
- **API Docs**: Swagger UI en `/swagger`, spec JSON en `/swagger/json`
- **MongoDB**: Scripts de utilidad (`db:ensure`, `check:mongo`, `seed`)
- **Auth**: Script para generar JWT tokens (`npm run generate-jwt`)

## 📚 Documentación Completa

Consulta la carpeta `docs/` para documentación detallada:

**Esenciales:**
- [overview.md](docs/overview.md) - **⭐ Introducción al proyecto** con arquitectura en capas
- [api.md](docs/api.md) - Contratos API con ejemplos de requests/responses
- [data-model.md](docs/data-model.md) - Colecciones MongoDB y relaciones
- [env.md](docs/env.md) - Variables de entorno completas

**Técnicos:**
- [security.md](docs/security.md) - Autenticación, validación, y best practices
- [logging.md](docs/logging.md) - Configuración Pino, niveles numéricos, rotación
- [pagination.md](docs/pagination.md) - Cursor-based pagination
- [error-codes.md](docs/error-codes.md) - Códigos de error y respuestas

**Operaciones:**
- [runbook.md](docs/runbook.md) - Comandos, deployment, troubleshooting
- [db.indexes.md](docs/db.indexes.md) - Índices MongoDB y optimización

**Desarrollo:**
- [folder-structure.md](docs/folder-structure.md) - **⭐ Organización del código** (consultar antes de crear archivos)
- [plan_cierre.md](docs/plan_cierre.md) - Estado del proyecto (85% completado)
- [reservations-validation.md](docs/reservations-validation.md) - Validación de integridad referencial

---

© EVENTOS
