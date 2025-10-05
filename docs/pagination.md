
# Paginación

## V1 (actual)
- `page` (>=1) y `pageSize` (<= 100 por defecto).
- Respuesta incluye `meta.page`, `meta.pageSize`, `meta.total`.

## V2 (propuesta)
- **Keyset** sobre `_id` (`after`, `before`), estable y eficiente.
