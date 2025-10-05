# TODOs backend Fastify + Mongo (Migración desde localrepo)

## Modelo de datos y validación
- [ ] **Validators de Mongo (JSON Schema) por colección**: `event_configs`, `precios`, `gastos`, `reservas`.
  - _Hecho cuando_: existe `ensureMongoArtifacts()` que aplica `collMod`/`createCollection` con `validator` y `validationLevel: "strict"`; se ejecuta opcionalmente al boot (`MONGO_BOOT=1`).
- [ ] **Regla de negocio Bizum en servidor** (ya añadida a `event-configs PUT`, pero falta) **validación a nivel de DB** si procede.
  - _Hecho cuando_: la regla está en capa de rutas/servicio y, si es viable, se refuerza con `$jsonSchema` (o se documenta por qué no).
- [ ] **Estandarizar tipos de fecha**: guardar `Date` en Mongo, responder ISO string en todas las rutas.
  - _Hecho cuando_: todos los repos usan helpers (`ensureDate` al escribir, `toISO` al leer).

## Índices y rendimiento
- [ ] **Índices base**:
  - `precios(eventId)`, `gastos(eventId)`, `reservas(eventId)`.
  - Índices compuestos según filtros habituales (cuando confirmemos filtros reales de UI).
  - _Hecho cuando_: `ensureMongoArtifacts()` crea índices idempotentes y los documenta.
- [ ] **Plan de paginación futura (V2)**: keyset/`_id` para tablas muy grandes.
  - _Hecho cuando_: hay propuesta documentada y ticket abierto (no implementar aún).

## CRUD y repos (ahora solo hay list)
- [ ] **Precios**: `POST /`, `PUT /:id`, `DELETE /:id` (con validaciones).
- [ ] **Gastos**: `POST /`, `PUT /:id`, `DELETE /:id` (coherencias `tipoPrecio`, `precioBase/Neto`, `isPack/unidadesPack`).
- [ ] **Reservas**: `POST /`, `PUT /:id`, `DELETE /:id` (coherencias y totales).
- [ ] **Event-configs**: validar shape de `selectores` y presets en el PUT (ya hay regla Bizum; falta el resto).
  - _Hecho cuando_: todos devuelven el mismo shape que el front actual espera (nombres/formatos exactos), con errores 400 bien formateados.

## Contratos y documentación
- [ ] **OpenAPI/Swagger completo**: esquemas de request/response por ruta, ejemplos y errores.
  - _Hecho cuando_: `GET /docs` muestra contratos con `200/400/404/204`, parámetros (`page/pageSize`, `eventId`, etc.), y ejemplos.

## Logging y observabilidad
- [ ] **Logger a fichero rotado** (p. ej., pino + pino-transport con rotación diaria).
  - _Hecho cuando_: logs `info/error/debug` se escriben en archivo (`logs/app-YYYY-MM-DD.log`) y en consola, con redacción de campos sensibles.
- [ ] **Correlación de peticiones**: `requestId` en cada log y propagado a repos.
- [ ] **Métricas básicas** (opcional): contador de requests por ruta + latencia (Prometheus si lo quieres luego).

## Errores y respuestas
- [ ] **Normalizar errores**: helper para `badRequest`, `notFound`, `conflict`, etc., con `code` y `message` consistentes.
  - _Hecho cuando_: no se lanzan `NotImplementedError` en producción; errores tienen `statusCode`, `code` interno y `message` claro.
- [ ] **Validación de query**: `page`, `pageSize`, `filters`, `sort`—tipar y validar (rango, formato).

## Seguridad (aunque “sin auth” por ahora)
- [ ] **CORS**: confirmar orígenes permitidos y métodos (ya está plugin; falta revisar config).
- [ ] **Rate limit “bajo”** por IP para evitar abuso (opcional).
- [ ] **Sanitización/escape** de strings que van a logs.

## Infra y arranque
- [ ] **Boot idempotente de artefactos Mongo**: `ensureMongoArtifacts()` (validators + índices) bajo flag env.
- [ ] **Variables de entorno**: `MONGO_URI`, `MONGO_DB`, `LOG_LEVEL`, `MONGO_BOOT`, etc., con `config/env` tipado.
- [ ] **Healthchecks**: ya hay `/health` y `/health/db`; mantenerlos verdes tras añadir validadores.

## Calidad y DX
- [ ] **ESLint + reglas anti-import `.js`** (ya lo dejaste limpio; falta dejar reglas en repo).
  - _Hecho cuando_: existe `.eslintrc` + husky/lint-staged que bloquean commits con `.js` en imports TS.
- [ ] **TSConfig**: `moduleResolution: "Bundler"` para evitar TS2835 en IDE.
- [ ] **Tests mínimos**:
  - Unit: helpers (`dates.ts`), repos (con DB in-memory o test DB).
  - E2E: smoke tests de rutas (`GET /health`, `GET /api/precios`, `PUT /api/event-configs/:id` con Bizum OK/no-OK).
- [ ] **PrintRoutes en boot** solo en `NODE_ENV !== 'production'`.

## Migración desde localrepo (funcional)
- [ ] **Paridad de columnas/filtrado/orden**: verificar que listados devuelven las mismas columnas que la UI espera (según `schemas.columns.ts`/presets).
- [ ] **Selectores embebidos en `event-configs`**: alinear claves (`comercial`, `metodoPago`, `puntoRecogida`, etc.) y sus campos (`notas`, `requiereReceptor`, etc.).
- [ ] **Eliminar “localRepo”** (cuando validemos una primera página con datos desde Mongo).
  - _Hecho cuando_: una vista (p. ej., “Precios”) consume backend y pasa QA visual/funcional.

## Tareas rápidas (próximas 48 h)
1. **`ensureMongoArtifacts()`** con validators + índices de `eventId`.
2. **CRUD `precios`** completo (POST/PUT/DELETE) replicando shape del front.
3. **Swagger** completo para `precios` y `event-configs` (incluye ejemplos y errores).
