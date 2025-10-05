
# Variables de entorno

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `PORT` | number | `3000` | Puerto HTTP |
| `NODE_ENV` | enum | `development` | `development` / `production` |
| `MONGODB_URI` | string | — | Cadena de conexión Mongo |
| `MONGODB_DB` | string | — | Base de datos |
| `SWAGGER_ENABLE` | boolean | `false` | Habilita `/docs` |
| `CORS_ORIGINS` | string | `*` | Lista CSV de orígenes permitidos |
| `LOG_LEVEL` | string | `info` | Nivel de log (`debug`, `info`, `warn`, `error`) |
| `LOG_DIR` | string | `./logs` | Directorio de logs |
| `LOG_FILE` | string | `app.log` | Fichero de logs |
| `MONGO_BOOT` | boolean | `false` | Crea validadores/índices si faltan |

> Para ejemplos, ver `.env.example` (añadir si aún no existe).
