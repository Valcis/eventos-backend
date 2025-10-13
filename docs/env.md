# Variables de entorno

## Variables Requeridas

| Variable     | Tipo   | Descripción                        |
| ------------ | ------ | ---------------------------------- |
| `MONGO_URL`  | string | **REQUERIDO** - URL conexión MongoDB (ej: `mongodb://localhost:27017`) |
| `MONGODB_DB` | string | **REQUERIDO** - Nombre de la base de datos |

## Variables Opcionales

| Variable       | Tipo    | Default       | Descripción                                     |
| -------------- | ------- | ------------- | ----------------------------------------------- |
| `PORT`         | number  | `3000`        | Puerto HTTP del servidor                        |
| `BASE_PATH`    | string  | `/api`        | Prefijo base para las rutas (ej: `/api`)        |
| `MONGO_BOOT`   | enum    | `0`           | `1` = crear índices en arranque, `0` = no crear |
| `AUTH_ENABLED` | boolean | `false`       | `true` = requiere Bearer token en todas las rutas (excepto /health y /swagger) |
| `LOG_LEVEL`    | string  | `info`        | Nivel de log: `debug`, `info`, `warn`, `error` |

## Configuración con Zod

Las variables se validan en `src/config/env.ts` usando **Zod**. Si falta alguna requerida, el servidor no arranca y muestra el error.

**Implementación**: `src/config/env.ts:6-22`

```typescript
const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  BASE_PATH: z.string().default('/api'),
  MONGO_URL: z.string().min(1), // requerido
  MONGODB_DB: z.string().min(1), // requerido
  MONGO_BOOT: z.enum(['0', '1']).default('0'),
  AUTH_ENABLED: z.coerce.boolean().default(false),
});
```

## Ejemplo .env

```bash
# MongoDB (REQUERIDO)
MONGO_URL=mongodb://localhost:27017
MONGODB_DB=eventos_dev

# Server
PORT=3000
BASE_PATH=/api

# Features
MONGO_BOOT=1
AUTH_ENABLED=false

# Logging
LOG_LEVEL=debug
```

## Uso en Código

```typescript
import { getEnv } from './config/env';

const env = getEnv();
console.log(env.PORT); // 3000
console.log(env.MONGO_URL); // mongodb://localhost:27017
console.log(env.AUTH_ENABLED); // false
```

## Comportamiento por Variable

### `MONGO_BOOT`

Cuando está en `1`, ejecuta `ensureMongoArtifacts()` en el arranque, que:
- Crea índices de forma idempotente
- Crea índices únicos para evitar duplicados
- No falla si los índices ya existen

**Uso recomendado**:
- `MONGO_BOOT=1` en desarrollo y primer despliegue
- `MONGO_BOOT=0` en producción (crear índices fuera del arranque)

### `AUTH_ENABLED`

Cuando está en `true`:
- Todas las rutas requieren header `Authorization: Bearer TOKEN`
- Rutas excluidas: `/health`, `/swagger`
- Retorna 401 si falta el token

**Uso recomendado**:
- `AUTH_ENABLED=false` en desarrollo local
- `AUTH_ENABLED=true` en staging/producción

**Nota**: Actualmente el plugin NO valida el token, solo verifica que exista. Ver `src/plugins/bearer.ts:36` para implementar validación JWT.

### `BASE_PATH`

Define el prefijo de todas las rutas de la API:
- `BASE_PATH=/api` → rutas en `/api/events`, `/api/products`, etc.
- `BASE_PATH=/v2` → rutas en `/v2/events`, `/v2/products`, etc.

## Notas de Seguridad

- ✅ **Nunca** subir `.env` al repositorio (está en `.gitignore`)
- ✅ En **producción**, usar variables de entorno del sistema, no archivo `.env`
- ✅ Con **Docker**, pasar variables con `-e` o `docker-compose.yml`
- ✅ Si falta una variable requerida, el proceso termina con código 1

## Ver también

- [.env.example](../.env.example) - Plantilla de configuración
- [Security](./security.md) - Configuración de autenticación
- [Zod Documentation](https://zod.dev/) - Librería de validación
