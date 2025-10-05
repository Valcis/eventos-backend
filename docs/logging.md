# Logging

- Logger con salida a **consola** y a **fichero** (`LOG_DIR`/`LOG_FILE`).
- **requestId** incluido por petición y propagado a repos.
- Rotación de logs: **pendiente** (ver roadmap).

## Campos sensibles

- Evitar loguear tokens, datos personales o secretos.

## Notas de logging

- Actualmente se usa `pino/file`. Pendiente incorporar **rotación diaria** (p. ej. `pino-rotating-file`) y
  `redact.paths` para evitar volcado de secretos (Authorization, tokens, etc.).
