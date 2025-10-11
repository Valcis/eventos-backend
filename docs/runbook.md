# Runbook

## Desarrollo

```bash
npm i
npm dev
```

## Producción

```bash
npm build
npm start
```

## Salud

- `GET /health`
- `GET /health/db`

## Mongo Artifacts

- Establece `MONGO_BOOT=1` para ejecutar `ensureMongoArtifacts()` en el arranque.
- Esto creará colecciones si faltan y aplicará `collMod` para actualizar validadores e índices.
- Si cambias validadores (por ejemplo, `additionalProperties: false`), arranca con `MONGO_BOOT=1` hasta que el cambio esté desplegado en todos los entornos.

## Problemas comunes

- **Falta `dist/`** → ejecuta `pnpm build` o revisa `tsconfig` (`noEmit` removido).
- **Conexión Mongo** → revisa `MONGODB_URI` y `MONGODB_DB`.
