
# Arquitectura

## Vista general
- **Fastify** como HTTP server.
- **Plugins**: CORS, Swagger, **requestId** (nuevo), logging.
- **Capa de datos**: MongoDB con conexión centralizada y función `ensureMongoArtifacts()` que crea **validadores** `$jsonSchema` e **índices** al inicio si `MONGO_BOOT=true`.
- **Módulos**: `event-configs`, `precios`, `gastos`, `reservas` con rutas, repos y validadores.
- **Utilidades**: paginación V1 (offset/pageSize), helper de respuestas `{ data, meta? }`.

## Flujo de petición
1. Llega la request → asignación/propagación de **requestId**.
2. Validación por schema (Fastify + Zod si aplica).
3. Lógica en controller/repo.
4. Respuesta con envelope uniforme `{ data, meta? }`.

## Decisiones de diseño
- **TypeScript estricto**, sin `any`.
- **Envelope** para respuestas, homogeneidad y extensibilidad con `meta`.
- **Validadores Mongo** para integridad de datos.
- **Swagger** como fuente de verdad de contratos (junto a `docs/api.md`).

## Directorios (propuesto)
```
src/
  app.ts
  index.ts
  plugins/
    cors.ts
    swagger.ts
    request-id.ts
  utils/
    reply.ts
    pagination.ts
  infra/
    mongo/
      client.ts
      artifacts.ts
      collections/
        event-configs.artifacts.ts
        precios.artifacts.ts
        gastos.artifacts.ts
        reservas.artifacts.ts
  modules/
    precios/
      precios.routes.ts
      precios.repo.ts
    gastos/
      gastos.routes.ts
      gastos.repo.ts
    reservas/
      reservas.routes.ts
      reservas.repo.ts
    event-configs/
      event-configs.routes.ts
      event-configs.repo.ts
docs/
```
