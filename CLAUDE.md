# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **TypeScript + Fastify + MongoDB** backend for event management ("EVENTOS"). The system follows strict TypeScript with a layered architecture using Factory patterns for both controllers and repositories.

**Key characteristics:**

- ES modules (`.js` extensions not used in imports)
- Strict TypeScript with `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Cursor-based pagination by default (not offset/limit)
- Soft delete pattern (`isActive: boolean`) across all entities
- Generic CRUD factories to minimize boilerplate
- Multi-tenant by event (all data partitioned by `eventId`)

## Development Commands

```bash
# Development (watch mode)
npm run dev

# Build
npm run build

# Production start
npm start

# Linting
npm run lint              # ESLint only
npm run lint:types        # TypeScript type check only
npm run check:lint        # Both ESLint + type check

# Fix linting issues
npm run lint:fix

# Format code
npm run format            # Prettier

# Database utilities
npm run check:mongo       # Verify MongoDB connection
npm run db:ensure         # Create MongoDB indexes manually
npm run seed              # Seed database with sample data

# Other utilities
npm run check:imports     # Verify import extensions
npm run generate-jwt      # Generate JWT token for testing
```

## Environment Configuration

Required environment variables (see `docs/env.md` for full details):

- `MONGO_URL` - MongoDB connection string (required)
- `MONGODB_DB` - Database name (required)
- `NODE_ENV` - `development` | `production` | `test` (default: `development`)
- `PORT` - Server port (default: 3000)
- `BASE_PATH` - API base path (default: `/api`)
- `MONGO_BOOT` - `0` | `1` - Auto-create indexes/validators on startup
- `AUTH_ENABLED` - Boolean - Enable/disable bearer token authentication
- `JWT_SECRET` - Secret key for JWT signing (required when AUTH_ENABLED=true, min 32 chars)
- `JWT_ALGORITHM` - JWT algorithm (default: `HS256`, options: HS256/HS384/HS512/RS256/RS384/RS512)
- `JWT_EXPIRES_IN` - JWT expiration time (default: `24h`, format: "1h", "7d", "30m")
- `LOG_LEVEL` - Logging level (default: `info`, options: debug/info/warn/error)

## Architecture Patterns

### Layered Architecture

The codebase follows a strict 4-layer architecture:

```
HTTP Routes (modules/*/routes.ts)
    ↓
Controllers (modules/controller.ts - Generic Factory)
    ↓
Repository/CRUD (infra/mongo/crud.ts - Generic Factory)
    ↓
MongoDB (infra/mongo/client.ts)
```

### Generic CRUD Factory (`infra/mongo/crud.ts`)

All data access uses `makeCrud()` which generates type-safe repositories:

```typescript
const repo = makeCrud<TDomain, TCreate, TUpdate>({
	collection: 'products',
	toDb: (data) => {
		/* transform incoming data to MongoDB doc */
	},
	fromDb: (doc) => {
		/* transform MongoDB doc to domain object */
	},
	softDelete: true, // default, uses isActive flag
	defaultSortBy: 'createdAt', // default sort field
	defaultSortDir: 'desc', // default sort direction
});
```

**Generated operations:**

- `create()` - Auto-adds `createdAt`, `updatedAt`, `isActive: true`
- `getById()` - Fetch by ObjectId string
- `list()` - Cursor-based pagination with dynamic sorting
- `update()` - Full replacement (`findOneAndReplace`)
- `patch()` - Partial update (`$set`)
- `softDelete()` - Sets `isActive: false` (or hard delete if `softDelete: false`)
- `removeHard()` - Physical deletion

### Generic Controller Factory (`modules/controller.ts`)

All HTTP logic uses `makeController()` which generates standard CRUD endpoints:

```typescript
const ctrl = makeController<TDomain, TCreate, TUpdate>(
	'products',
	mapIn, // Request body → MongoDB document
	mapOut, // MongoDB document → Response body
	{
		softDelete: true,
		defaultSortBy: 'createdAt',
		defaultSortDir: 'desc',
	},
);
```

**Generated endpoints:**

- `GET /` - List with cursor pagination
- `GET /:id` - Get by ID
- `POST /` - Create new resource
- `PUT /:id` - Full replacement
- `PATCH /:id` - Partial update
- `DELETE /:id` - Soft delete

### Pagination Strategy

**Always cursor-based** (never offset-based):

- Query params: `?limit=50&after=<cursor>&sortBy=<field>&sortDir=asc|desc`
- Default sort: `createdAt desc`
- Response includes `nextCursor` for fetching next page
- Supports dynamic sorting on any indexed field
- Cursor is the `_id` of the last item in the previous page

Implementation in `shared/lib/cursor.ts` and `infra/mongo/crud.ts`.

### Soft Delete Pattern

All collections use `isActive: boolean`:

- `isActive: true` - Active record
- `isActive: false` - Soft deleted
- Indexes always include `isActive` for efficient filtering
- `PATCH` and `PUT` operations preserve `isActive` state
- Hard delete available via `removeHard()` but not exposed by default

### Multi-tenant by Event

All data is partitioned by `eventId` (ObjectId reference to `events` collection):

- Indexes always start with `(eventId, isActive, ...)`
- All queries must filter by `eventId`
- Catalogs are scoped per event (e.g., `products`, `salespeople`, `payment_methods`)

## Data Model

Main collections:

- `events` - Root entity (events like concerts, conferences)
- `reservations` - Bookings for events
- `expenses` - Event expenses
- `products` - Products catalog per event
- `promotions` - Time-based promotions per event
- Catalogs (all per event): `salespeople`, `payment_methods`, `cashiers`, `stores`, `units`, `consumption_types`, `payers`, `pickup_points`, `partners`

See `docs/data-model.md` and `infra/mongo/artifacts.ts` for schema details.

### Index Strategy

Indexes are created by `ensureMongoArtifacts()` (see `infra/mongo/artifacts.ts`):

- **Pattern**: `(eventId, isActive, <field>)` for most queries
- **Uniqueness**: Case-insensitive (collation `{ locale: 'en', strength: 2 }`)
- **Common unique constraints**: `(eventId, name)` for catalogs
- **Dates**: Descending order (`-1`) for "most recent first"
- **Stable pagination**: `(eventId, isActive, _id)` compound indexes

Enable auto-creation on startup with `MONGO_BOOT=1`.

## Code Conventions

### TypeScript Strict Mode

- **No `any`** - Use proper types or `unknown`
- **Boolean props** - Prefix with `is*` (e.g., `isActive`, `isDelivered`, `isPaid`)
- **Optional properties** - Use `?` syntax, not `| undefined`
- **Index access** - Always check for `undefined` due to `noUncheckedIndexedAccess`

### Import/Export Style

- **No `.js` extensions** in TypeScript imports (ESM with `moduleResolution: Bundler`)
- **Default exports** for route files
- **Named exports** for utilities, schemas, types

### Error Handling

Custom error class in `core/http/errors.ts`:

```typescript
throw new AppError('NOT_FOUND', 'Resource not found', 404);
```

Global error handler in `app.ts` handles:

- `AppError` - Custom application errors
- `ZodError` - Validation errors (returns structured `details`)
- MongoDB duplicate key (code 11000) - Returns 409 Conflict
- Fastify validation errors

### API Response Envelopes

All responses use standardized envelopes (see `core/http/envelopes.ts`):

**Success (single item):**

```json
{
  "ok": true,
  "data": { "id": "...", ... }
}
```

**Success (list):**

```json
{
  "ok": true,
  "data": [...],
  "page": {
    "limit": 50,
    "nextCursor": "60a7...",
    "total": 150
  }
}
```

**Error:**

```json
{
  "ok": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "error": "Bad Request",
  "message": "...",
  "details": { ... }
}
```

## OpenAPI/Swagger

- Swagger UI available at `/swagger`
- Uses `@fastify/swagger` + `@fastify/swagger-ui` + `fastify-type-provider-zod`
- Schemas defined with Zod, auto-converted to OpenAPI dynamically
- Response schemas in `shared/schemas/responses.ts`
- OpenAPI spec generated from Zod schemas (not static YAML)

## Authentication

Bearer token authentication plugin (`plugins/bearer.ts`):

- Controlled by `AUTH_ENABLED` env var (default: `false`)
- Exempt paths configured per-plugin (e.g., `/health`, `/swagger`)
- **JWT verification is IMPLEMENTED** - validates token signature, expiration, and required payload fields
- Uses `jsonwebtoken` library for token verification
- Validates payload contains `userId`, `email`, and `role`
- Handles token expiration errors (`TokenExpiredError`) and invalid tokens (`JsonWebTokenError`)
- Authenticated user payload attached to `req.user` for downstream use

## Rate Limiting

The application includes rate limiting configured in `src/app.ts`:

- Uses `@fastify/rate-limit` plugin
- Default: 100 requests per minute per IP
- Localhost IPs (`127.0.0.1`) are allowlisted
- Can be configured via environment variables (see `docs/security.md`)

## MongoDB Connection

Singleton pattern in `infra/mongo/client.ts`:

```typescript
const db = await connectMongo(); // Returns Db instance
```

Connection is established once during app bootstrap and decorated on Fastify instance:

```typescript
app.decorate('db', db);
```

## Logging

Uses Pino logger with:

- Request ID tracking (`core/logging/requestId.ts`)
- Response time tracking (`onResponse` hook)
- Structured logging with contextual fields
- Log sanitization (see `docs/logging.md`)

## Security

### Input Validation

- **ObjectId validation**: All route parameters containing IDs are validated before database operations
- **MongoDB operator injection prevention**: Query params are sanitized to block dangerous MongoDB operators ($where, $regex, $ne, etc.)
- **Zod schema validation**: All request bodies validated against strict Zod schemas

### Referential Integrity

- **Reservations**: Full referential integrity validation for products, catalogs, and linked reservations
- **Foreign key validation**: All referenced entities (eventId, salespersonId, etc.) validated to exist before create/update
- **Cascade validation**: Products checked for existence, stock availability, and event membership

Implementation in `modules/reservations/validation.ts` and `core/middleware/sanitize.ts`.

### MongoDB Transactions

- **Stock operations**: Create/delete reservation operations use MongoDB transactions for atomicity
- **Fallback mode**: Graceful degradation to sequential operations if transactions unavailable (standalone MongoDB)
- **Production requirement**: Use replica set for guaranteed atomicity

Implementation in `modules/reservations/stock.ts`.

## Testing & Validation

- **Test framework**: Vitest configured with coverage support
- **Test commands**:
  - `npm test` - Run tests once
  - `npm run test:watch` - Run tests in watch mode
  - `npm run test:ui` - Open Vitest UI
  - `npm run test:coverage` - Generate coverage report
- **Validation**: Zod schemas in `modules/*/schema.ts`
- **Type checking**: `npm run lint:types`

Configuration in `vitest.config.ts`.

## Common Tasks

### Adding a New Collection/Module

1. Define Zod schemas in `modules/<name>/schema.ts`
2. Create `mapIn` and `mapOut` transformers
3. Create routes using `makeController()` in `modules/<name>/routes.ts`
4. Register routes in `app.ts` with appropriate prefix
5. Add indexes in `infra/mongo/artifacts.ts` if needed
6. Update OpenAPI schemas if exposing via Swagger

### Modifying Indexes

Edit `infra/mongo/artifacts.ts` and either:

- Set `MONGO_BOOT=1` to auto-create on next startup, or
- Run manual MongoDB commands, or
- Use `db-ensure.ts` script

### Changing Pagination Defaults

Modify in controller options:

```typescript
makeController(collection, mapIn, mapOut, {
	defaultSortBy: 'date',
	defaultSortDir: 'asc',
});
```

Or in CRUD options:

```typescript
makeCrud({
	// ...
	defaultSortBy: 'name',
	defaultSortDir: 'asc',
});
```

## Important Files

- `src/app.ts` - Application bootstrap, plugin registration, error handlers
- `src/server.ts` - Server entry point
- `src/config/env.ts` - Environment variable validation
- `src/modules/controller.ts` - Generic controller factory
- `src/infra/mongo/crud.ts` - Generic CRUD repository factory
- `src/infra/mongo/artifacts.ts` - Index and validator definitions
- `docs/folder-structure.md` - **⭐ Folder organization criteria** (consult before creating files)
- `docs/architecture.md` - Detailed architecture documentation
- `docs/api.md` - API contract documentation

## Documentation

Comprehensive docs in `/docs`:

- `folder-structure.md` - **⭐ IMPORTANT: Folder organization and criteria** (read this before creating new files/folders)
- `architecture.md` - Architecture patterns
- `data-model.md` - Collection schemas
- `api.md` - API contracts and examples
- `pagination.md` - Pagination implementation
- `env.md` - Environment variables
- `logging.md` - Logging configuration
- `security.md` - Security considerations
- `error-codes.md` - Error codes and handling
- `reservations-validation.md` - Referential integrity validation
