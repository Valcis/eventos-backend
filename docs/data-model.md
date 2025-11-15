# Modelo de Datos

## Visión General

El modelo de datos está diseñado para gestionar **eventos multi-tenant**, donde cada evento tiene su propia configuración de productos, gastos, reservas y catálogos.

**Colecciones globales** (no multi-tenant):
- `users` - Usuarios del sistema con autenticación y roles
- `events` - Eventos principales

**Relación principal**: Todas las demás colecciones tienen un campo `eventId` que las vincula a un evento específico (multi-tenant).

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

### `users`

Usuarios del sistema con autenticación local (email/password) o Auth0 (OAuth social).

**Campos**:

- `_id` (ObjectId) - ID único generado por MongoDB
- `email` (string) - Email del usuario **[único, case-insensitive]**
- `passwordHash` (string, opcional) - Hash bcrypt de la contraseña (solo para `provider='local'`)
- `name` (string) - Nombre completo del usuario
- `role` (enum) - Rol: `'user'`, `'admin'`, `'owner'` (default: `'user'`)
- `provider` (enum) - Proveedor de autenticación: `'local'`, `'auth0'` (default: `'local'`)
- `providerId` (string, opcional) - ID del usuario en Auth0 (para `provider='auth0'`)
- `eventIds` (array[string], opcional) - IDs de eventos a los que tiene acceso. Si vacío/null, acceso a todos
- `avatar` (string, opcional) - URL del avatar
- `emailVerified` (boolean) - Indica si el email está verificado (default: `false`)
- `lastLoginAt` (Date, opcional) - Fecha del último login
- `isActive` (boolean) - Estado activo/inactivo
- `createdAt` (Date) - Fecha de creación
- `updatedAt` (Date) - Última actualización

**Roles**:

- `user` - Usuario estándar (puede ver eventos, hacer reservas)
- `admin` - Administrador (gestión completa de eventos y catálogos)
- `owner` - Propietario (acceso total, gestión de usuarios)

**Proveedores**:

- `local` - Autenticación tradicional con email + password (JWT local)
- `auth0` - OAuth social via Auth0 (Google, Instagram, Facebook, etc.)

**Índices**:

- `uniq_users_email` (único, case-insensitive) - Garantiza emails únicos
- `idx_users_provider_providerId` - Búsqueda por proveedor externo
- `idx_users_role` - Búsqueda por rol
- `idx_users_isActive` - Filtrado de usuarios activos

**Seguridad**:

- Passwords hasheados con bcrypt (10 salt rounds)
- `passwordHash` nunca expuesto en respuestas API
- Email único a nivel global (no por evento)

---

### `reservations`

Reservas de productos para un evento.

**Campos principales**:

- `_id`, `eventId`, `reserver` **[único por eventId]**
- `order` (object) - Mapa de `{ productId: quantity }`
- `totalAmount` (string) - Importe total calculado
- `salespersonId` (string, opcional), `consumptionTypeId`, `paymentMethodId`, `cashierId` (string, opcional)
- `pickupPointId` (string, opcional) - ID del punto de recogida donde el cliente recogerá su pedido
- `hasPromoApplied` (boolean) - Calculado por backend
- `deposit` (string, opcional), `isDelivered` (boolean), `isPaid` (boolean)
- `linkedReservations` (array[string], opcional)
- `appliedPromotionsSnapshot` (array[object], opcional) - Snapshot inmutable de productos, precios y promociones aplicadas. Se guarda cuando `isPaid=true` o `isDelivered=true` para auditoría y facturación. Cada elemento contiene:
  - `productId`, `productName`, `quantity`
  - `unitPriceOriginal`, `unitPriceFinal`, `subtotal` (formato Money)
  - `promotionsApplied[]` - Array de promociones con `promotionId`, `promotionName`, `rule`, `discountPerUnit`
- `notes` (string, opcional), `isActive` (boolean), `createdAt`, `updatedAt` (Date)

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
- `promotions` (array[string], opcional) - IDs de promociones aplicables
- `nominalPrice` (string, opcional) - Precio nominal (formato: "12.34")
- `supplement` (object, opcional) - Suplementos por tipo de consumo: `{ consumptionTypeId: centavos }` (número entero en céntimos). Ejemplo: `{"507f...": 50}` = +0.50€
- `notes` (string, opcional)
- `isActive` (boolean)
- `createdAt`, `updatedAt` (Date)

**Índices**:

- `uniq_products_eventId_name` (único)
- `idx_products_eventId_isActive`

---

### `promotions`

Promociones aplicables a productos.

**Campos principales**:

- `_id`, `eventId`, `name`
- `description` (string, opcional) - Descripción detallada de la promoción
- `applicables` (array[string], opcional) - IDs de productos a los que aplica
- `rule` (enum) - Tipo de promoción
- `conditions` (object, opcional) - JSON dinámico según la regla
- `startDate`, `endDate` (Date) - Rango de vigencia
- `priority` (number) - Prioridad de aplicación (menor = mayor prioridad)
- `isCumulative` (boolean) - Si puede combinarse con otras promociones
- `isActive` (boolean)
- `createdAt`, `updatedAt` (Date)

**Enum Rules**:
- `XForY` - X unidades por el precio de Y (ej: 3x2)
- `DiscountPerUnit` - Descuento fijo por unidad
- `BulkPrice` - Precio por bloque (ej: 5 por 10€)
- `PercentageDiscount` - Porcentaje de descuento
- `ComboDiscount` - Descuento por combinación de productos
- `FixedPriceBundle` - Precio fijo por bundle concreto
- `BuyXGetYFree` - Compra X y recibe Y gratis
- `MaxUnitsDiscounted` - Máximo de unidades con descuento
- `FirstXUnitsFree` - Primeras X unidades gratis
- `TimeLimitedDiscount` - Descuento limitado por tiempo

---

### `expenses`

Gastos del evento.

**Campos principales**:

- `_id`, `eventId`, `ingredient`
- `basePrice`, `vatPct`, `vatAmount`, `netPrice` (string formato Money)
- `quantity` (string, opcional), `unitId` (string, opcional)
- `isPackage` (boolean) - Indica si es compra por paquetes/lotes
- `unitsPerPack` (number, opcional) - Número de unidades por paquete (si isPackage=true)
- `unitPrice` (string, opcional) - Precio por unidad individual
- `payerId`, `storeId` (string, opcional)
- `isVerified` (boolean) - Indica si el gasto ha sido verificado/aprobado
- `notes` (string, opcional)
- `isActive` (boolean)
- `createdAt`, `updatedAt` (Date)

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
