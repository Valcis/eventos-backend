# Índices de MongoDB

> Índices idempotentes creados por `ensureMongoArtifacts()` para optimizar consultas.

## Convenciones

- **Nombres de índices**:
    - `idx_*` - Índice normal (no único)
    - `uniq_*` - Índice único
- **Collation**: Case-insensitive (`{ locale: 'en', strength: 2 }`) en índices únicos de texto
- **Idempotencia**: `createIndexes()` no falla si el índice ya existe
- **Implementación**: `src/infra/mongo/artifacts.ts:14-101`

---

## Colección: `events`

### `uniq_events_name` (ÚNICO)

```javascript
{
	name: 1;
}
```

- **Collation**: Case-insensitive
- **Propósito**: Garantizar nombres únicos de eventos
- **Consultas optimizadas**:
    - Búsqueda por nombre exacto
    - Validación de duplicados en creación
    - `find({ name: "Fiesta 2025" })`

### `idx_events_date`

```javascript
{
	date: 1;
}
```

- **Propósito**: Listado cronológico de eventos
- **Consultas optimizadas**:
    - `find({ date: { $gte: startDate, $lte: endDate } })`
    - Ordenar eventos por fecha

**Código**: `src/infra/mongo/artifacts.ts:16-19`

---

## Colección: `reservations`

### `uniq_reservations_eventId_reserver` (ÚNICO)

```javascript
{ eventId: 1, reserver: 1 }
```

- **Collation**: Case-insensitive
- **Propósito**: Un reservador único por evento
- **Consultas optimizadas**:
    - Validación de duplicados al crear reserva
    - `find({ eventId, reserver: "Juan Pérez" })`

### `idx_reservations_eventId_createdAt`

```javascript
{ eventId: 1, createdAt: -1 }
```

- **Propósito**: Listado de reservas por evento, más recientes primero
- **Consultas optimizadas**:
    - `find({ eventId }).sort({ createdAt: -1 })`
    - Paginación cursor-based

### `idx_reservations_eventId_isPaid_createdAt`

```javascript
{ eventId: 1, isPaid: 1, createdAt: -1 }
```

- **Propósito**: Filtrar reservas pagadas/pendientes dentro de un evento
- **Consultas optimizadas**:
    - `find({ eventId, isPaid: false })`
    - Dashboard de cobros pendientes

### `idx_reservations_eventId_isDelivered_createdAt`

```javascript
{ eventId: 1, isDelivered: 1, createdAt: -1 }
```

- **Propósito**: Filtrar reservas entregadas/pendientes
- **Consultas optimizadas**:
    - `find({ eventId, isDelivered: false })`
    - Control de entregas

### `idx_reservations_salespersonId_createdAt`

```javascript
{ salespersonId: 1, createdAt: -1 }
```

- **Propósito**: Reservas por vendedor
- **Consultas optimizadas**:
    - Reportes de ventas por vendedor
    - Comisiones

### `idx_reservations_paymentMethodId_createdAt`

```javascript
{ paymentMethodId: 1, createdAt: -1 }
```

- **Propósito**: Reservas por método de pago
- **Consultas optimizadas**:
    - Reportes de ingresos por método (efectivo, tarjeta, etc.)

### `idx_reservations_cashierId_createdAt`

```javascript
{ cashierId: 1, createdAt: -1 }
```

- **Propósito**: Reservas procesadas por cajero
- **Consultas optimizadas**:
    - Auditoría de caja
    - Arqueos

**Código**: `src/infra/mongo/artifacts.ts:22-47`

---

## Colección: `products`

### `uniq_products_eventId_name` (ÚNICO)

```javascript
{ eventId: 1, name: 1 }
```

- **Collation**: Case-insensitive
- **Propósito**: Producto único por evento
- **Consultas optimizadas**:
    - Validación de duplicados
    - `find({ eventId, name: "Cerveza" })`

### `idx_products_eventId_categoryId_name`

```javascript
{ eventId: 1, categoryId: 1, name: 1 }
```

- **Propósito**: Productos por categoría (si se implementa)
- **Consultas optimizadas**:
    - Agrupación por categoría
    - Menús organizados

### `idx_products_eventId_isActive`

```javascript
{ eventId: 1, isActive: 1 }
```

- **Propósito**: Filtrar productos activos
- **Consultas optimizadas**:
    - `find({ eventId, isActive: true })`
    - Listado de productos disponibles

**Código**: `src/infra/mongo/artifacts.ts:50-62`

---

## Colección: `promotions`

### `idx_promotions_eventId_start_end`

```javascript
{ eventId: 1, startDate: 1, endDate: 1 }
```

- **Propósito**: Promociones vigentes en un rango de fechas
- **Consultas optimizadas**:
    - `find({ eventId, startDate: { $lte: now }, endDate: { $gte: now } })`
    - Aplicación automática de promos

### `idx_promotions_eventId_priority_desc`

```javascript
{ eventId: 1, priority: -1 }
```

- **Propósito**: Promociones ordenadas por prioridad (mayor primero)
- **Consultas optimizadas**:
    - Aplicar promociones en orden de prioridad
    - Resolución de conflictos

**Código**: `src/infra/mongo/artifacts.ts:65-68`

---

## Colección: `expenses`

### `idx_expenses_eventId_createdAt`

```javascript
{ eventId: 1, createdAt: -1 }
```

- **Propósito**: Gastos por evento, más recientes primero
- **Consultas optimizadas**:
    - Listado de gastos
    - Paginación cursor-based

### `idx_expenses_eventId_isVerified`

```javascript
{ eventId: 1, isVerified: 1 }
```

- **Propósito**: Filtrar gastos verificados/pendientes
- **Consultas optimizadas**:
    - `find({ eventId, isVerified: false })`
    - Control presupuestario

### `idx_expenses_payerId_createdAt`

```javascript
{ payerId: 1, createdAt: -1 }
```

- **Propósito**: Gastos por pagador
- **Consultas optimizadas**:
    - Reportes de gastos por socio
    - Liquidaciones

### `idx_expenses_storeId_createdAt`

```javascript
{ storeId: 1, createdAt: -1 }
```

- **Propósito**: Gastos por proveedor
- **Consultas optimizadas**:
    - Análisis de proveedores
    - Historial de compras

**Código**: `src/infra/mongo/artifacts.ts:71-76`

---

## Catálogos (9 colecciones)

Todas las colecciones de catálogo tienen los mismos 2 índices:

### `idx_{collection}_eventId`

```javascript
{
	eventId: 1;
}
```

- **Propósito**: Filtrar catálogo por evento
- **Consultas optimizadas**: `find({ eventId })`

### `uniq_{collection}_eventId_name` (ÚNICO)

```javascript
{ eventId: 1, name: 1 }
```

- **Collation**: Case-insensitive
- **Propósito**: Nombre único dentro del evento
- **Consultas optimizadas**:
    - Validación de duplicados
    - Búsqueda por nombre

**Aplica a**:

- `units` - Unidades de medida
- `salespeople` - Vendedores
- `paymentmethods` - Métodos de pago
- `cashiers` - Cajeros
- `stores` - Tiendas/Proveedores
- `consumptiontypes` - Tipos de consumo
- `payers` - Pagadores de gastos
- `pickuppoints` - Puntos de recogida
- `partners` - Socios del evento

**Código**: `src/infra/mongo/artifacts.ts:79-100`

---

## Estrategia de Paginación

Los índices están diseñados para **paginación cursor-based** usando `_id`:

```javascript
// Primera página
db.collection.find(query).sort({ _id: 1 }).limit(50);

// Siguiente página (after = último _id de la página anterior)
db.collection
	.find({ ...query, _id: { $gt: ObjectId(after) } })
	.sort({ _id: 1 })
	.limit(50);
```

**Ventajas**:

- ✅ Escalable (no usa `skip`)
- ✅ Consistente (no salta resultados si hay inserciones)
- ✅ Eficiente (siempre usa índice `_id` nativo)
- ✅ Performance constante independiente de la página

**Ver**: [Pagination Documentation](./pagination.md)

---

## Activación de Índices

### Automático en Arranque

Los índices se crean automáticamente si `MONGO_BOOT=1`:

```bash
MONGO_BOOT=1 npm run dev
```

**Qué hace**:

1. Ejecuta `ensureMongoArtifacts(db)` en `src/app.ts:40-48`
2. Crea todos los índices con `createIndexes()` (idempotente)
3. No falla si los índices ya existen
4. Actualiza índices si cambiaron (drop + recreate)

### Manual con Script

```bash
npm run db:ensure
```

O directamente:

```bash
tsx src/scripts/db-ensure.ts
```

---

## Monitoreo de Índices

### Ver índices existentes

```javascript
// En mongo shell
use eventos_prod
db.products.getIndexes()
```

**Output esperado**:

```javascript
[
	{ v: 2, key: { _id: 1 }, name: '_id_' },
	{
		v: 2,
		key: { eventId: 1, name: 1 },
		name: 'uniq_products_eventId_name',
		unique: true,
		collation: { locale: 'en', strength: 2 },
	},
	{ v: 2, key: { eventId: 1, isActive: 1 }, name: 'idx_products_eventId_isActive' },
	// ...
];
```

### Analizar uso de índices

```javascript
db.products.find({ eventId: 'abc123' }).explain('executionStats');
```

**Verificar** en el resultado:

```javascript
{
  "executionStats": {
    "executionSuccess": true,
    "totalDocsExamined": 10,  // ← Debe ser igual o cercano a nReturned
    "nReturned": 10
  },
  "winningPlan": {
    "stage": "IXSCAN",  // ← Debe decir IXSCAN (usa índice)
    "indexName": "idx_products_eventId_isActive"
  }
}
```

⚠️ **Si aparece `COLLSCAN`** significa que NO usa índice (scan completo) → problema de performance.

### Estadísticas de índices

```javascript
db.products.aggregate([{ $indexStats: {} }]);
```

Muestra:

- Número de accesos por índice
- Índices no utilizados (candidatos para borrar)

---

## Mantenimiento de Índices

### Reconstruir índices (si están fragmentados)

```javascript
db.products.reIndex();
```

⚠️ **Cuidado**: Bloquea la colección durante la operación.

### Borrar índice no usado

```javascript
db.products.dropIndex('idx_products_categoryId');
```

### Tamaño de índices

```javascript
db.products.stats().indexSizes;
```

**Output**:

```javascript
{
  "_id_": 245760,
  "uniq_products_eventId_name": 163840,
  "idx_products_eventId_isActive": 122880
}
```

---

## Best Practices

### ✅ DO

- Crear índices para campos usados en `find()`, `sort()` y filtros frecuentes
- Usar índices compuestos para queries complejas (ej: `{ eventId: 1, isActive: 1 }`)
- Índices únicos para constraints de negocio
- Monitorear uso de índices con `explain()`

### ❌ DON'T

- Crear índices en campos raramente consultados
- Índices en campos con baja cardinalidad (ej: boolean simple)
- Demasiados índices (ralentizan escrituras)
- Índices duplicados o redundantes

### 📊 Regla General

- **Lecturas frecuentes** → Añadir índice
- **Escrituras frecuentes** → Minimizar índices
- **Balance**: ~5-10 índices por colección principal

---

## Troubleshooting

### Query lenta

1. Ejecutar con `explain()`:

```javascript
db.products.find({ eventId: '123' }).explain('executionStats');
```

2. Verificar:
    - `executionTimeMillis` (debe ser <100ms)
    - `totalDocsExamined` vs `nReturned` (deben ser similares)
    - `stage: "IXSCAN"` (debe usar índice)

3. Si no usa índice, crear uno:

```javascript
db.products.createIndex({ eventId: 1 });
```

### Error: índice no se puede crear

**Causa común**: Documentos duplicados violan constraint único

**Solución**: Limpiar duplicados antes de crear índice:

```javascript
// Encontrar duplicados
db.products.aggregate([
	{ $group: { _id: { eventId: '$eventId', name: '$name' }, count: { $sum: 1 } } },
	{ $match: { count: { $gt: 1 } } },
]);

// Borrar duplicados manualmente
```

### Índice grande consume mucha RAM

**Solución**:

- Revisar si el índice es necesario
- Considerar índices parciales (solo documentos activos):

```javascript
db.products.createIndex({ eventId: 1, name: 1 }, { partialFilterExpression: { isActive: true } });
```

---

## Ver también

- [Data Model](./data-model.md) - Estructura de colecciones
- [Pagination](./pagination.md) - Estrategia de paginación cursor-based
- [Operations](./operations.md) - Mantenimiento y monitoreo
- [MongoDB Indexes Docs](https://www.mongodb.com/docs/manual/indexes/)
- `src/infra/mongo/artifacts.ts` - Código fuente
