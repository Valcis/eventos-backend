
# Runbook

## Desarrollo
```bash
pnpm i
pnpm dev
```

## Producción
```bash
pnpm build
pnpm start
```

## Salud
- `GET /health`
- `GET /health/db`

## Mongo Artifacts
- `MONGO_BOOT=true` para asegurar validadores e índices.

## Problemas comunes
- **Falta `dist/`** → ejecuta `pnpm build` o revisa `tsconfig` (`noEmit` removido).
- **Conexión Mongo** → revisa `MONGODB_URI` y `MONGODB_DB`.
