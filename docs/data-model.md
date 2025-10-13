# Modelo de Datos

## Visión General

El modelo de datos está diseñado para gestionar **eventos multi-tenant**, donde cada evento tiene su propia configuración de productos, gastos, reservas y catálogos.

**Relación principal**: Todas las colecciones (excepto `events`) tienen un campo `eventId` que las vincula a un evento específico.

---

## Colecciones

### `events`

Entidad principal que representa un evento.

**Campos**:

- `_id` (ObjectId) - ID único generado por MongoDB
- `name` (string) - Nombre del evento **[único, case-insensitive]**
- `date` (Date) - Fecha del evento
- `capacity` (number, opcional) - Capacidad máxima de asistentes
- `capitalAmount` (string, opcional) - Capital inicial (formato: "12345.67")
- `isActive` (boolean) - Estado activo/inactivo
- `createdAt` (Date) - Fecha de creación
- `updatedAt` (Date) - Última actualización

**Índices**:

- `uniq_events_name` (único) - Garantiza nombres únicos
- `idx_events_date` - Búsqueda por fecha

---

### `reservations`

Reservas de productos para un evento.

**Campos principales**:

- `_id`, `eventId`, `reserver` **[único por eventId]**
- `order` (object) - Mapa de `{ productId: quantity }`
- `totalAmount` (string) - Importe total calculado
- `salespersonId`, `consumptionTypeId`, `paymentMethodId`, `cashierId`
- `hasPromoApplied` (boolean) - Calculado por backend
- `deposit`, `isDelivered`, `isPaid`
- `linkedReservations` (array[string])
- `notes`, `isActive`, `createdAt`, `updatedAt`

**Índices principales**:

- `uniq_reservations_eventId_reserver` (único)
- `idx_reservations_eventId_createdAt`
- Índices adicionales por isPaid, isDelivered, salespersonId, etc.

---

### `products`

Productos disponibles en un evento.

**Campos principales**:

- `_id`, `eventId`, `name` **[único por eventId]**
- `description` (string, opcional) - Descripción del producto
- `stock` (number) - Cantidad disponible en inventario
- `promotions` (array[string]) - IDs de promociones aplicables
- `nominalPrice` (string, opcional) - Precio nominal (formato: "12.34")
- `supplement` (object, opcional) - Suplementos por tipo de consumo: `{ consumptionTypeId: amount }`
- `notes` (string, opcional)
- `isActive` (boolean)
- `createdAt`, `updatedAt` (Date)

**Nota importante**: Los campos de precio (`price`, `vatPct`, `vatAmount`, `netPrice`) y empaquetado (`isPackage`, `unitsPerPack`, `unitPrice`) se gestionan ahora en otra parte del sistema.

**Índices**:

- `uniq_products_eventId_name` (único)
- `idx_products_eventId_isActive`

---

### `promotions`

Promociones aplicables a productos.

**Campos principales**:

- `_id`, `eventId`, `name`
- `applicables` (array[string]) - IDs de productos
- `rule` (enum) - Tipo de promoción
- `conditions` (object) - JSON dinámico
- `startDate`, `endDate`, `priority`
- `isCumulative` (boolean)

**Enum Rules**: XForY, DiscountPerUnit, BulkPrice, PercentageDiscount, ComboDiscount, etc.

---

### `expenses`

Gastos del evento.

**Campos principales**:

- `_id`, `eventId`, `ingredient`
- `basePrice`, `vatPct`, `vatAmount`, `netPrice`
- `quantity`, `unitId`
- `payerId`, `storeId`, `isVerified`

---

## Catálogos

Todas las colecciones de catálogo tienen estructura similar con **unicidad por (eventId, name)**:

- **`salespeople`** - Vendedores
- **`paymentmethods`** - Métodos de pago
- **`cashiers`** - Cajeros
- **`stores`** - Tiendas/Proveedores
- **`units`** - Unidades de medida
- **`consumptiontypes`** - Tipos de consumo
- **`payers`** - Pagadores de gastos
- **`pickuppoints`** - Puntos de recogida
- **`partners`** - Socios del evento

**Índices comunes**:

- `idx_{collection}_eventId`
- `uniq_{collection}_eventId_name` (único, case-insensitive)

---

## Convenciones

### Formato Money

String con 2 decimales: `"0.00"`, `"15.99"`, `"1234.56"`

### IVA (VAT)

Porcentajes: `"0"`, `"4"`, `"10"`, `"21"`

### Soft Delete

Todas las colecciones usan `isActive: boolean`

### Timestamps

- `createdAt` - Automático en creación
- `updatedAt` - Automático en cada modificación

---

## Diagrama de Relaciones

```
events (1)
  ├─→ reservations (*) → salespeople, consumptiontypes, paymentmethods, cashiers, products
  ├─→ products (*) → promotions
  ├─→ promotions (*)
  ├─→ expenses (*) → units, payers, stores
  └─→ [todos los catálogos] (*)
```

---

## Ver también

- [PlantUML Diagram](./data_model.puml) - Diagrama visual completo
- [DB Indexes](./db.indexes.md) - Índices y optimizaciones
- [API](./api.md) - Endpoints disponibles
