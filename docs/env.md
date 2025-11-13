# Variables de entorno

## Variables Requeridas

| Variable     | Tipo   | Descripción                                                            |
| ------------ | ------ | ---------------------------------------------------------------------- |
| `MONGO_URL`  | string | **REQUERIDO** - URL conexión MongoDB (ej: `mongodb://localhost:27017`) |
| `MONGODB_DB` | string | **REQUERIDO** - Nombre de la base de datos                             |

## Variables Opcionales

| Variable         | Tipo    | Default       | Descripción                                                                     |
| ---------------- | ------- | ------------- | ------------------------------------------------------------------------------- |
| `NODE_ENV`       | enum    | `development` | Entorno de ejecución: `development`, `production`, `test`                       |
| `PORT`           | number  | `3000`        | Puerto HTTP del servidor                                                        |
| `BASE_PATH`      | string  | `/api`        | Prefijo base para las rutas (ej: `/api`)                                        |
| `MONGO_BOOT`     | enum    | `0`           | `1` = crear índices en arranque, `0` = no crear                                 |
| `AUTH_ENABLED`   | boolean | `false`       | `true` = requiere Bearer token en todas las rutas (excepto /health y /swagger)  |
| `JWT_SECRET`     | string  | -             | **REQUERIDO si AUTH_ENABLED=true**. Secret para firmar JWT (mínimo 32 caracteres) |
| `JWT_ALGORITHM`  | enum    | `HS256`       | Algoritmo JWT: `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`            |
| `JWT_EXPIRES_IN` | string  | `24h`         | Tiempo de expiración del token (ej: `1h`, `7d`, `30m`)                         |
| `LOG_LEVEL`      | string  | `info`        | Nivel de log: `debug`, `info`, `warn`, `error`                                  |

## Configuración con Zod

Las variables se validan en `src/config/env.ts` usando **Zod**. Si falta alguna requerida, el servidor no arranca y muestra el error.

**Implementación**: `src/config/env.ts:6-25`

```typescript
const Env = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().int().min(1).max(65535).default(3000),
	BASE_PATH: z.string().default('/api'),
	MONGO_URL: z.string().min(1), // requerido
	MONGODB_DB: z.string().min(1), // requerido
	MONGO_BOOT: z.enum(['0', '1']).default('0'),
	AUTH_ENABLED: z.string().optional().default('false').transform((val) => val === 'true' || val === '1'),
	// JWT Configuration
	JWT_SECRET: z.string().min(32).optional(), // Requerido si AUTH_ENABLED=true
	JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).optional().default('HS256'),
	JWT_EXPIRES_IN: z.string().optional().default('24h'),
});
```

**Validación condicional**: El servidor valida que `JWT_SECRET` esté presente cuando `AUTH_ENABLED=true` (líneas 34-39).

## Ejemplo de configuración

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```bash
# MongoDB (REQUERIDO)
MONGO_URL=mongodb://localhost:27017
MONGODB_DB=eventos_dev

# Entorno
NODE_ENV=development

# Server
PORT=3000
BASE_PATH=/api

# Features
MONGO_BOOT=1
AUTH_ENABLED=false

# JWT (REQUERIDO si AUTH_ENABLED=true)
# JWT_SECRET=tu-secret-super-seguro-de-al-menos-32-caracteres
# JWT_ALGORITHM=HS256
# JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=debug
```

**Nota**: Las líneas comentadas con `#` son opcionales. Descoméntalas según tu configuración.

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

### `AUTH_ENABLED` y JWT

Cuando `AUTH_ENABLED=true`:

- Todas las rutas requieren header `Authorization: Bearer TOKEN`
- Rutas excluidas: `/health`, `/swagger`
- El token JWT se **valida completamente** (firma, expiración, payload)
- Retorna 401 con código específico si el token falta, es inválido o está expirado

**Uso recomendado**:

- `AUTH_ENABLED=false` en desarrollo local
- `AUTH_ENABLED=true` en staging/producción

**Validación JWT implementada** en `src/plugins/bearer.ts:42-104`:
- Verifica firma usando `JWT_SECRET`
- Valida expiración del token
- Requiere campos `userId`, `email`, `role` en el payload
- Adjunta usuario autenticado a `req.user`

### `JWT_SECRET`

**REQUERIDO** cuando `AUTH_ENABLED=true`. Debe tener mínimo 32 caracteres.

Genera un secret seguro:

```bash
# Opción 1: OpenSSL
openssl rand -base64 32

# Opción 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### `JWT_ALGORITHM`

Algoritmo para firmar/verificar tokens. Opciones:

- `HS256`, `HS384`, `HS512` (HMAC - usar con `JWT_SECRET`)
- `RS256`, `RS384`, `RS512` (RSA - requiere claves públicas/privadas)

**Recomendado**: `HS256` para la mayoría de casos.

### `JWT_EXPIRES_IN`

Tiempo de expiración del token. Formato:

- `1h` - 1 hora
- `24h` - 24 horas (default)
- `7d` - 7 días
- `30m` - 30 minutos

**Recomendado**: `24h` para sesiones web, `1h` para APIs críticas.

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

- [Security](./security.md) - Configuración de autenticación y JWT
- [Bearer Plugin](../src/plugins/bearer.ts) - Implementación de autenticación
- [Generate JWT](../src/system/cli/generate-jwt.ts) - Script para generar tokens de prueba
- [Zod Documentation](https://zod.dev/) - Librería de validación
