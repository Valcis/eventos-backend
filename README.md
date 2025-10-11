# EVENTOS – Backend Fastify + Mongo

Este repositorio implementa un backend en **TypeScript estricto** con **Fastify** y **MongoDB**.

## TL;DR

```bash
# 1) Configura variables de entorno
cp .env   # (crea este archivo si no existe)
# 2) Arranque en dev (tsx + watch)
pnpm dev
# 3) Arranque en prod (compila a dist y ejecuta)
pnpm build && pnpm start
# 4) Swagger UI
open http://localhost:PORT/docs
```

> **Nota:** A partir de esta versión, `tsconfig.json` **sí emite** a `dist/` (`"noEmit"` eliminado).

---

## Requisitos

- Node.js LTS
- pnpm
- MongoDB (local o remoto)

## Variables de entorno (resumen)

Consulta **docs/env.md** para detalle completo. Algunas claves:

- `PORT` (por defecto 3000)
- `NODE_ENV` (`development` | `production`)
- `MONGODB_URI` y `MONGODB_DB`
- `SWAGGER_ENABLE` (`true`/`false`) → activa `/docs`
- `CORS_ORIGINS` → orígenes permitidos
- `LOG_LEVEL`, `LOG_DIR`, `LOG_FILE`
- `MONGO_BOOT` (`true`/`false`) → crea validadores/índices si faltan

## Arquitectura

- **Fastify** con plugins: CORS, Swagger, **requestId** (nuevo), logging.
- **Mongo**: conexión centralizada, artefactos (`ensureMongoArtifacts`) para validadores e índices.
- **Módulos**: `event-configs`, `precios`, `gastos`, `reservas`.
- **Utilidades**: paginación V1 (`page`, `pageSize`), helpers de respuesta `{ data, meta }`.

Más info en **docs/architecture.md** y **docs/data-model.md**.

## Contratos API

- Envelope uniforme en respuestas: **`{ data, meta? }`**.
- `POST` de todas las entidades devuelve **`{ data: { id } }`**.
- Esquemas y ejemplos en **docs/api.md** y Swagger (`/docs`).

## Desarrollo

```bash
pnpm i
pnpm dev
# Lint & typecheck
pnpm lint && pnpm typecheck
```

## Producción

```bash
pnpm build
pnpm start
```

- `build` compila TypeScript a `dist/` (sin `noEmit`).
- `start` ejecuta `node dist/index.js`.

## Salud y utilidades

- `GET /health` y `GET /health/db`
- Script `check-mongo`
- (Opcional) `MONGO_BOOT=true` para crear artefactos en arranque.

## Contribución

Sigue **docs/contrib.md**. Resumen:

- Sin `any`, tipado estricto, boolean props con prefijo `is*`.
- Evitar `.js` en imports TS.
- Documenta cambios y actualiza Swagger y `docs/` cuando modifiques contratos.

## Seguridad

- CORS configurable.
- Sanitización de logs (ver **docs/logging.md**).
- Rate limiting opcional (pendiente de decidir).

## Roadmap

- Rotación de logs (pendiente).
- Paginación V2 (keyset) y métricas.
- Endurecimiento progresivo de validadores.

---

© EVENTOS
