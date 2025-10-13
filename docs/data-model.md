# Modelo de datos

## Colecciones

### `event_configs`

- Índices: `{ eventId: 1 }` (único o no según diseño).
- Validador: `selectores` y `presets` con `additionalProperties: false` (endurecido).

### `precios`, `gastos`, `reservas`

- Índice base por `eventId`.
- Campos obligatorios según cada entidad.

> Ver archivos `*.artifacts.ts` para los `$jsonSchema` concretos.

### Reglas de validación (Mongo)

- **precios**: `$jsonSchema` con `required: ["eventId","concepto","importe","moneda","isActive"]` y `additionalProperties: false`.
- **gastos**: `required: ["eventId","concepto","importe","categoria"]`, `additionalProperties: false`.
- **reservas**: `required: ["eventId","reservaId","estado"]`, `additionalProperties: false`.
- `validationLevel: "moderate"` durante la migración; pasar a `"strict"` cuando los datos estén limpios.

### Índices

- Índice base `{ eventId: 1 }` en las tres colecciones para filtrar por evento.
