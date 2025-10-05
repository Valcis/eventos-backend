
# Modelo de datos

## Colecciones

### `event_configs`
- Índices: `{ eventId: 1 }` (único o no según diseño).
- Validador: `selectores` y `presets` con `additionalProperties: false` (endurecido).

### `precios`, `gastos`, `reservas`
- Índice base por `eventId`.
- Campos obligatorios según cada entidad.

> Ver archivos `*.artifacts.ts` para los `$jsonSchema` concretos.
