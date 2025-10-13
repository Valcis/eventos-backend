# Paginación

## Implementación Actual: Cursor-Based

El proyecto usa **paginación cursor-based** sobre el campo `_id` de MongoDB. Esta estrategia es más eficiente y escalable que paginación offset-based (`skip`).

---

## Cómo Funciona

### Query Parameters

Todos los endpoints `GET /` (listados) aceptan:

| Parámetro | Tipo   | Default | Descripción                                            |
| --------- | ------ | ------- | ------------------------------------------------------ |
| `limit`   | number | `50`    | Cantidad de items por página (min: 1, max: 200)        |
| `after`   | string | —       | Cursor: ObjectId del último item de la página anterior |

**Adicionales**: Cualquier campo de la colección se puede usar como filtro (ej: `?eventId=abc&isActive=true`)

### Response Format

```json
{
  "items": [...],
  "page": {
    "limit": 50,
    "nextCursor": "6745abc123def456...",
    "total": 250
  }
}
```

| Campo        | Descripción                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `items`      | Array de resultados (máximo `limit` elementos)                                                  |
| `limit`      | Límite usado en esta consulta                                                                   |
| `nextCursor` | ObjectId del último item (usar como `after` en siguiente request). `null` si no hay más páginas |
| `total`      | Cantidad total de items que cumplen el filtro (sin paginación)                                  |

---

## Ejemplos de Uso

### Primera Página

```bash
curl "http://localhost:3000/api/products?limit=10"
```

**Response**:

```json
{
  "items": [
    { "id": "6745abc001...", "name": "Producto 1", ... },
    { "id": "6745abc002...", "name": "Producto 2", ... },
    ...
    { "id": "6745abc010...", "name": "Producto 10", ... }
  ],
  "page": {
    "limit": 10,
    "nextCursor": "6745abc010...",
    "total": 45
  }
}
```

### Segunda Página

Usar el `nextCursor` de la respuesta anterior como parámetro `after`:

```bash
curl "http://localhost:3000/api/products?limit=10&after=6745abc010..."
```

**Response**:

```json
{
  "items": [
    { "id": "6745abc011...", "name": "Producto 11", ... },
    ...
  ],
  "page": {
    "limit": 10,
    "nextCursor": "6745abc020...",
    "total": 45
  }
}
```

### Última Página

Cuando no hay más resultados, `nextCursor` es `null`:

```json
{
  "items": [
    { "id": "6745abc041...", ... },
    { "id": "6745abc042...", ... },
    { "id": "6745abc043...", ... },
    { "id": "6745abc044...", ... },
    { "id": "6745abc045...", ... }
  ],
  "page": {
    "limit": 10,
    "nextCursor": null,
    "total": 45
  }
}
```

### Con Filtros

Combinar paginación con filtros:

```bash
curl "http://localhost:3000/api/reservations?eventId=abc123&isPaid=false&limit=20"
```

Los filtros se mantienen entre páginas:

```bash
curl "http://localhost:3000/api/reservations?eventId=abc123&isPaid=false&limit=20&after=6745xyz..."
```

---

## Implementación Técnica

### En el Repositorio (`infra/mongo/crud.ts`)

```typescript
async list(db: Db, query: TQuery, options?: {
  limit?: number;
  after?: string | null
}): Promise<CursorPage<TDomain>> {
  const limit = Math.max(1, Math.min(200, options?.limit ?? 50));
  const after = options?.after ?? null;

  // Cursor por _id (ObjectId creciente)
  const cursorFilter: Filter<Document> = {...query};
  if (after) {
    const _after = ensureObjectId(after);
    cursorFilter._id = { $gt: _after }; // Continuar después del cursor
  }

  const total = await col.countDocuments(query);

  const docs = await col
    .find(cursorFilter)
    .sort({ _id: 1 })  // Ordenar por _id ascendente
    .limit(limit)
    .toArray();

  const nextCursor = docs.length === limit && docs.at(-1)
    ? String(docs.at(-1)._id)
    : null;

  return { items, page: { limit, nextCursor, total } };
}
```

**Ver**: `src/infra/mongo/crud.ts:87-118`

### En el Controlador (`modules/controller.ts`)

```typescript
list: async (req: FastifyRequest, reply: FastifyReply) => {
	const db = (req.server as any).db as Db;
	const q = req.query as any;

	const limit = Math.min(50, Math.max(5, Number(q.limit ?? 15)));
	const after = typeof q.after === 'string' ? q.after : undefined;

	// Remover parámetros de paginación del query
	delete q.limit;
	delete q.after;

	const result = await repo.list(db, q, { limit, after });
	return reply.send(result);
};
```

**Ver**: `src/modules/controller.ts:20-28`

---

## Ventajas de Cursor-Based

### ✅ Escalable

- No usa `skip()` que se vuelve lento con millones de registros
- Siempre usa índice sobre `_id`

### ✅ Consistente

- Si se insertan/borran items mientras paginas, no se pierden resultados
- El cursor siempre apunta a una posición específica

### ✅ Eficiente

- MongoDB puede usar índice `_id` nativo
- Performance constante independiente de la página

### ✅ Simple

- Solo necesitas guardar el `nextCursor`
- No necesitas calcular offsets

---

## Limitaciones

### ❌ No permite saltar a página arbitraria

- No puedes ir directamente a "página 5"
- Solo puedes avanzar secuencialmente

### ❌ No hay navegación "hacia atrás" simple

- Para ir hacia atrás necesitarías `before` (no implementado)
- Solución: el cliente guarda cursors previos

### ❌ El orden debe ser estable

- Siempre ordena por `_id` ascendente
- Si necesitas otro orden, requiere índices adicionales

---

## Mejoras Futuras

### Opción 1: Bidireccional

Añadir parámetro `before` para navegar hacia atrás:

```typescript
?before=6745abc010&limit=10
```

### Opción 2: Ordenamiento Custom

Permitir orden por otros campos con cursor compuesto:

```typescript
?sortBy=createdAt&order=desc&after=6745abc010
```

### Opción 3: Hybrid Pagination

Combinar cursor-based (para datos grandes) con offset (para UI con páginas numeradas):

```typescript
?page=3&limit=20  // Traduce a after internamente
```

---

## Ver también

- [CRUD Implementation](../src/infra/mongo/crud.ts:87-118) - Código de paginación
- [Controller](../src/modules/controller.ts:20-28) - Manejo en endpoint
- [API Documentation](./api.md) - Uso desde el cliente
- [MongoDB Cursor-Based Pagination](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/#pagination-example)
