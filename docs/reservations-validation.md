# Validación de Integridad Referencial - Reservations

Este documento describe las validaciones de integridad referencial implementadas en el endpoint `POST /api/reservations`.

## Resumen

Al crear una reserva, se realizan **4 tipos de validaciones** antes de insertar en la base de datos:

1. ✅ **Validación del Evento** - Verifica que el evento existe y está activo
2. ✅ **Validación de Productos** - Verifica existencia, pertenencia al evento y stock disponible
3. ✅ **Validación de Catálogos** - Verifica que todos los catálogos referenciados existen y pertenecen al evento
4. ✅ **Validación de Reservas Vinculadas** - Verifica que las reservas vinculadas existen y pertenecen al evento

---

## 1. Validación del Evento

### ¿Qué valida?

- El `eventId` existe en la colección `events`
- El evento está activo (`isActive: true`)

### Ejemplo de error

**Request:**

```json
{
  "eventId": "507f1f77bcf86cd799439099",
  "order": {...},
  ...
}
```

**Response (404):**

```json
{
	"statusCode": 404,
	"code": "NOT_FOUND",
	"error": "Not Found",
	"message": "El evento con ID 507f1f77bcf86cd799439099 no existe o está inactivo."
}
```

---

## 2. Validación de Productos

### ¿Qué valida?

1. El campo `order` contiene al menos un producto
2. Todos los `productId` en `order` existen en la colección `products`
3. Todos los productos están activos (`isActive: true`)
4. Todos los productos pertenecen al `eventId` especificado
5. Hay **stock suficiente** para cada producto

### Errores posibles

#### A. Pedido vacío

**Request:**

```json
{
  "eventId": "507f1f77bcf86cd799439011",
  "order": {},
  ...
}
```

**Response (400):**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "El pedido (order) debe contener al menos un producto."
}
```

#### B. Productos inexistentes

**Request:**

```json
{
  "order": {
    "507f1f77bcf86cd799439011": 2,
    "999999999999999999999999": 3
  },
  ...
}
```

**Response (400):**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "Los siguientes productos no existen o están inactivos: 999999999999999999999999"
}
```

#### C. Productos de otro evento

**Request:**

```json
{
  "eventId": "507f1f77bcf86cd799439011",
  "order": {
    "608f1f77bcf86cd799439022": 5
  },
  ...
}
```

**Response (400):**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "Los siguientes productos no pertenecen al evento: 608f1f77bcf86cd799439022"
}
```

#### D. Stock insuficiente

**Request:**

```json
{
  "order": {
    "507f1f77bcf86cd799439011": 100
  },
  ...
}
```

**Producto en BD:**

```json
{
	"_id": "507f1f77bcf86cd799439011",
	"name": "Cerveza",
	"stock": 10
}
```

**Response (400):**

```json
{
	"statusCode": 400,
	"code": "INSUFFICIENT_STOCK",
	"error": "Bad Request",
	"message": "Stock insuficiente para los siguientes productos:\nCerveza: solicitado 100, disponible 10"
}
```

---

## 3. Validación de Catálogos

### ¿Qué valida?

Se validan **5 catálogos** (2 obligatorios + 3 opcionales):

| Campo               | Colección          | Obligatorio | Descripción                                  |
| ------------------- | ------------------ | ----------- | -------------------------------------------- |
| `consumptionTypeId` | `consumptiontypes` | ✅ Sí       | Tipo de consumo (para llevar, in situ, etc.) |
| `paymentMethodId`   | `paymentmethods`   | ✅ Sí       | Método de pago (efectivo, tarjeta, etc.)     |
| `salespersonId`     | `salespeople`      | ❌ Opcional | Vendedor que gestionó la reserva             |
| `pickupPointId`     | `pickuppoints`     | ❌ Opcional | Punto de recogida                            |
| `cashierId`         | `cashiers`         | ❌ Opcional | Cajero que procesó el pago                   |

### Para cada catálogo valida:

1. El ID existe en su colección correspondiente
2. El catálogo está activo (`isActive: true`)
3. El catálogo pertenece al `eventId` especificado

### Ejemplo de error

**Request:**

```json
{
  "eventId": "507f1f77bcf86cd799439011",
  "consumptionTypeId": "999999999999999999999999",
  ...
}
```

**Response (400):**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "El tipo de consumo con ID 999999999999999999999999 no existe, está inactivo o no pertenece al evento."
}
```

---

## 4. Validación de Reservas Vinculadas

### ¿Qué valida?

- Si `linkedReservations` existe y tiene elementos, valida que:
    1. Todas las reservas existen en la colección `reservations`
    2. Todas las reservas pertenecen al mismo `eventId`

### Ejemplo de error

**Request:**

```json
{
  "eventId": "507f1f77bcf86cd799439011",
  "linkedReservations": ["507f1f77bcf86cd799439011", "999999999999999999999999"],
  ...
}
```

**Response (400):**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "Las siguientes reservas vinculadas no existen: 999999999999999999999999"
}
```

---

## Flujo Completo de Validación

```
┌─────────────────────────────────────────────┐
│   POST /api/reservations                    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ 1. Validar Evento   │
        │ ✅ Existe y activo? │
        └─────────┬───────────┘
             ✅   │   ❌ 404 NOT_FOUND
                  ▼
        ┌─────────────────────┐
        │ 2. Validar Productos│
        │ ✅ Existen?         │
        │ ✅ Mismo evento?    │
        │ ✅ Stock suficiente?│
        └─────────┬───────────┘
             ✅   │   ❌ 400 VALIDATION_ERROR
                  │      400 INSUFFICIENT_STOCK
                  ▼
        ┌─────────────────────┐
        │ 3. Validar Catálogos│
        │ ✅ consumptionType  │
        │ ✅ paymentMethod    │
        │ ✅ salesperson?     │
        │ ✅ pickupPoint?     │
        │ ✅ cashier?         │
        └─────────┬───────────┘
             ✅   │   ❌ 400 VALIDATION_ERROR
                  ▼
        ┌─────────────────────┐
        │ 4. Validar Linked   │
        │ ✅ Reservas existen?│
        │ ✅ Mismo evento?    │
        └─────────┬───────────┘
             ✅   │   ❌ 400 VALIDATION_ERROR
                  ▼
        ┌─────────────────────┐
        │ ✅ Crear Reserva    │
        │ 201 Created         │
        └─────────────────────┘
```

---

## Implementación Técnica

### Archivos involucrados

- **`src/modules/reservations/validation.ts`** - Funciones de validación
- **`src/modules/reservations/routes.ts`** - Handler POST con validaciones

### Funciones de validación

```typescript
// Validar evento
await validateEvent(db, body.eventId);

// Validar productos
await validateProducts(db, body.eventId, body.order);

// Validar catálogos
await validateReservationCatalogs(db, body.eventId, {
	salespersonId: body.salespersonId ?? undefined,
	consumptionTypeId: body.consumptionTypeId,
	pickupPointId: body.pickupPointId ?? undefined,
	paymentMethodId: body.paymentMethodId,
	cashierId: body.cashierId ?? undefined,
});

// Validar reservas vinculadas
await validateLinkedReservations(db, body.linkedReservations, body.eventId);
```

---

## Beneficios

### ✅ Integridad de Datos

- **No hay referencias rotas** - Todos los IDs apuntan a documentos que existen
- **Consistencia multi-tenant** - No se pueden mezclar datos de diferentes eventos
- **Stock controlado** - No se aceptan pedidos sin stock disponible

### ✅ Mensajes de Error Claros

- Errores descriptivos que indican **exactamente qué falta** o está mal
- Códigos de error consistentes (`VALIDATION_ERROR`, `NOT_FOUND`, `INSUFFICIENT_STOCK`)
- Detalles específicos (nombres de productos, IDs faltantes, stock disponible)

### ✅ Performance

- Validaciones en paralelo cuando es posible (`Promise.all`)
- Una sola query por colección
- Índices en MongoDB optimizan las búsquedas

---

## Próximas Mejoras (Roadmap)

### 🔜 Control de Stock con Transacciones

Actualmente la validación de stock **no decrementa** el stock automáticamente.

**Próxima implementación:**

1. Usar transacciones MongoDB (`session.withTransaction`)
2. Validar stock + decrementar stock atómicamente
3. Rollback automático si falla

### 🔜 Cálculo Automático de TotalAmount

Actualmente el cliente debe calcular `totalAmount` y `hasPromoApplied`.

**Próxima implementación:**

1. Calcular precio base de cada producto
2. Aplicar suplementos según `consumptionTypeId`
3. Aplicar promociones vigentes
4. Retornar `totalAmount` calculado

---

## Ver También

- [Error Codes](./error-codes.md) - Todos los códigos de error de la API
- [Data Model](./data-model.md) - Estructura de colecciones MongoDB
- [Architecture](./architecture.md) - Arquitectura del sistema
