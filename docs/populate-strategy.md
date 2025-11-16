# Estrategia de Populate (Referencias Expandidas)

## Resumen

Este sistema implementa una estrategia de **"populate siempre"** donde todos los endpoints devuelven **objetos completos** en lugar de solo IDs para las referencias entre entidades.

Esto significa que el frontend **nunca necesita hacer múltiples requests** para obtener datos relacionados - toda la información viene en una sola respuesta.

## Concepto

### Antes (Solo IDs)
```json
{
  "id": "123",
  "ingredient": "Carbón",
  "payerId": "abc",
  "storeId": "def",
  "netPrice": "10.00"
}
```

El frontend necesitaría hacer 2 requests adicionales:
- `GET /api/payers/abc` para obtener el nombre del pagador
- `GET /api/stores/def` para obtener el nombre de la tienda

### Después (Objetos Poblados)
```json
{
  "id": "123",
  "ingredient": "Carbón",
  "payer": {
    "id": "abc",
    "name": "Organización Principal",
    "phone": "+34600666777",
    "isActive": true
  },
  "store": {
    "id": "def",
    "name": "Mercado Central",
    "seller": "Juan Comerciante",
    "phone": "+34600222333",
    "isActive": true
  },
  "netPrice": "10.00"
}
```

**Resultado**: El frontend tiene toda la información en 1 sola petición.

## Implementación Técnica

### 1. Schemas Embebidos

Todos los schemas embebidos están definidos en `/src/shared/schemas/embedded.ts`:

- `EmbeddedEvent` - Eventos
- `EmbeddedSalesperson` - Vendedores
- `EmbeddedConsumptionType` - Tipos de consumo
- `EmbeddedPickupPoint` - Puntos de recogida
- `EmbeddedPaymentMethod` - Métodos de pago
- `EmbeddedCashier` - Cajeros
- `EmbeddedPayer` - Pagadores
- `EmbeddedStore` - Tiendas
- `EmbeddedUnit` - Unidades
- `EmbeddedProduct` - Productos (versión ligera)
- `EmbeddedPromotion` - Promociones (versión ligera)

Cada schema embebido contiene solo los **campos esenciales** para mostrar en el frontend (no todos los campos de la entidad completa).

### 2. Transformación Bidireccional

#### ToDb (Input → MongoDB)

Cuando el frontend envía un objeto embebido, el backend extrae solo el ID:

```typescript
toDb: (data) => {
  const transformed = { ...data };

  // Extraer ID del objeto payer
  if ('payer' in data && data.payer && typeof data.payer === 'object') {
    transformed.payerId = new ObjectId(data.payer.id);
    delete transformed.payer;
  }

  return transformed;
}
```

**Nota**: El frontend puede enviar tanto objetos completos como solo IDs - el backend los maneja ambos.

#### FromDb (MongoDB → Output)

Cuando el backend lee de MongoDB, hace lookup y construye objetos embebidos:

```typescript
fromDb: async (doc, db) => {
  const { _id, payerId, ...rest } = doc;

  // Lookup del pagador
  const payerDoc = await db.collection('payers').findOne({ _id: payerId });
  const payer = payerDoc ? {
    id: String(payerDoc._id),
    name: payerDoc.name,
    phone: payerDoc.phone,
    isActive: payerDoc.isActive ?? true,
  } : undefined;

  return {
    id: String(_id),
    payer,
    ...rest
  };
}
```

### 3. Soporte Async en makeCrud

Para soportar lookups asíncronos, se actualizó `makeCrud` para permitir `fromDb` async:

```typescript
fromDb: (doc: WithId<Document>, db: Db) => TDomain | Promise<TDomain>
```

Todos los lugares que llaman a `fromDb` ahora hacen `await fromDb(doc, db)`.

## Módulos con Populate

### Expenses (Gastos)

**Referencias pobladas**:
- `payer` (EmbeddedPayer) - **Requerido**
- `store` (EmbeddedStore) - **Opcional**
- `unit` (EmbeddedUnit) - **Opcional**

**Ejemplo de respuesta**:
```json
{
  "id": "...",
  "eventId": "...",
  "ingredient": "Carbón 5kg",
  "quantity": "10.00",
  "payer": {
    "id": "...",
    "name": "Organización Principal",
    "phone": "+34600666777",
    "isActive": true
  },
  "store": {
    "id": "...",
    "name": "Mercado Central",
    "seller": "Juan Comerciante",
    "phone": "+34600222333",
    "isActive": true
  },
  "unit": {
    "id": "...",
    "name": "Kilogramo",
    "abbreviation": "kg",
    "isActive": true
  },
  "basePrice": "8.26",
  "vatPct": 21,
  "vatAmount": "1.74",
  "netPrice": "10.00"
}
```

### Reservations (Reservas)

**Referencias pobladas**:
- `salesperson` (EmbeddedSalesperson) - **Opcional**
- `consumptionType` (EmbeddedConsumptionType) - **Requerido**
- `pickupPoint` (EmbeddedPickupPoint) - **Opcional**
- `paymentMethod` (EmbeddedPaymentMethod) - **Requerido**
- `cashier` (EmbeddedCashier) - **Opcional**

**Ejemplo de respuesta**:
```json
{
  "id": "...",
  "eventId": "...",
  "reserver": "Juan Pérez",
  "order": {
    "productId1": 2,
    "productId2": 3
  },
  "totalAmount": "43.50",
  "salesperson": {
    "id": "...",
    "name": "Laura García",
    "phone": "+34600111222",
    "isActive": true
  },
  "consumptionType": {
    "id": "...",
    "name": "Para llevar",
    "notes": "Comida para llevar",
    "isActive": true
  },
  "pickupPoint": {
    "id": "...",
    "name": "Mostrador A",
    "dealerName": "María López",
    "phone": "+34600999000",
    "isActive": true
  },
  "paymentMethod": {
    "id": "...",
    "name": "Efectivo",
    "isActive": true
  },
  "cashier": {
    "id": "...",
    "name": "Caja Principal",
    "phone": "+34600555666",
    "isActive": true
  }
}
```

### Products (Productos)

**Referencias pobladas**:
- `promotions` (Array<EmbeddedPromotion>) - **Opcional**

**Ejemplo de respuesta**:
```json
{
  "id": "...",
  "eventId": "...",
  "name": "Cerveza Artesanal",
  "description": "Cerveza IPA local 33cl",
  "stock": 200,
  "nominalPrice": "4.50",
  "promotions": [
    {
      "id": "...",
      "name": "3x2 en Cervezas",
      "description": "Compra 3 cervezas y paga solo 2",
      "rule": "XForY",
      "priority": 1,
      "isCumulative": false,
      "startDate": "2025-06-15T00:00:00.000Z",
      "endDate": "2025-06-15T23:59:59.000Z",
      "isActive": true
    }
  ]
}
```

### Promotions (Promociones)

**Referencias pobladas**:
- `applicables` (Array<EmbeddedProduct>) - **Requerido**

**Ejemplo de respuesta**:
```json
{
  "id": "...",
  "eventId": "...",
  "name": "3x2 en Cervezas",
  "description": "Compra 3 cervezas y paga solo 2",
  "rule": "XForY",
  "conditions": {
    "_rule": "XForY",
    "buyX": 3,
    "payY": 2
  },
  "applicables": [
    {
      "id": "...",
      "name": "Cerveza Artesanal",
      "description": "Cerveza IPA local 33cl",
      "nominalPrice": "4.50",
      "stock": 200,
      "isActive": true
    }
  ],
  "priority": 1,
  "isCumulative": false
}
```

## Manejo de Campos Opcionales

Los campos opcionales se manejan con lookups condicionales:

```typescript
// Si storeId existe, hacer lookup
const store = storeId ? await db.collection('stores').findOne({ _id: storeId }) : null;

// Incluir en respuesta solo si existe
const base = {
  ...rest,
  payer, // Siempre presente
  ...(store ? { store: buildEmbeddedStore(store) } : {}), // Solo si existe
};
```

## Rendimiento

### Consideraciones

1. **Más queries a MongoDB**: Cada lookup es una query adicional
2. **Respuestas más grandes**: Los objetos son más grandes que IDs
3. **Latencia**: Múltiples lookups pueden aumentar el tiempo de respuesta

### Optimizaciones Implementadas

1. **Parallel lookups**: Se usan `Promise.all()` cuando hay múltiples referencias
2. **Índices**: Todas las colecciones tienen índices en `_id` (automático)
3. **Campos mínimos**: Los schemas embebidos solo incluyen campos esenciales
4. **Caching futuro**: Se puede agregar caché de objetos embebidos si es necesario

### Métricas Esperadas

- **Expense con 3 referencias**: ~3-5ms adicionales (3 lookups)
- **Reservation con 5 referencias**: ~5-8ms adicionales (5 lookups)
- **Product con promotions**: Variable según número de promociones
- **Promotion con applicables**: Variable según número de productos

**Trade-off aceptado**: Preferimos ~5-10ms más de latencia en el backend a cambio de:
- Eliminar múltiples roundtrips HTTP frontend ↔ backend
- Simplificar lógica del frontend
- Mejor experiencia de desarrollo

## Compatibilidad con Input

El sistema acepta **ambos formatos** en el input (POST/PUT/PATCH):

### Formato 1: Solo ID (backward compatible)
```json
{
  "ingredient": "Carbón",
  "payerId": "abc123",
  "basePrice": "8.26"
}
```

### Formato 2: Objeto completo
```json
{
  "ingredient": "Carbón",
  "payer": {
    "id": "abc123",
    "name": "Organización Principal"
  },
  "basePrice": "8.26"
}
```

**Ambos funcionan** - el `toDb` extrae el ID en ambos casos.

## Desarrollo

### Agregar Nueva Referencia

Para agregar un nuevo campo con populate:

1. **Crear schema embebido** en `/src/shared/schemas/embedded.ts`
2. **Actualizar schema principal** reemplazando `Id` con `EmbeddedX`
3. **Actualizar toDb** para extraer ID del objeto embebido
4. **Actualizar fromDb** para hacer lookup y construir objeto embebido
5. **Actualizar documentación** (este archivo)

### Testing

Para probar populate:

```bash
# Obtener expense con objetos poblados
GET /api/expenses/:id

# Debería devolver payer, store, unit como objetos completos

# Obtener lista de expenses
GET /api/expenses?eventId=...

# Todos los items deberían tener objetos poblados
```

## Referencia Rápida

| Entidad | Campos Poblados | Archivo Schema |
|---------|----------------|---------------|
| Expenses | payer, store?, unit? | `modules/expenses/schema.ts` |
| Reservations | salesperson?, consumptionType, pickupPoint?, paymentMethod, cashier? | `modules/reservations/schema.ts` |
| Products | promotions? | `modules/catalogs/products/schema.ts` |
| Promotions | applicables | `modules/catalogs/promotions/schema.ts` |

## Migración desde IDs

Si tienes código antiguo que espera IDs:

```typescript
// ❌ Código antiguo (ya no funciona)
const payerId = expense.payerId;

// ✅ Código nuevo
const payerId = expense.payer.id;
const payerName = expense.payer.name;
```

**Nota**: Esto es un breaking change para clientes existentes del API.
