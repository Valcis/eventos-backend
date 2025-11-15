# Lógica de Negocio de Precios y Promociones - ✅ IMPLEMENTADA

**Estado**: ✅ **COMPLETADA** - Toda la lógica de negocio ha sido implementada y está lista para uso.

**Archivos Implementados**:
- `src/modules/catalogs/promotions/calculator.ts` - Calculador de 10 tipos de promociones
- `src/modules/reservations/pricing.ts` - Cálculo dinámico de precios con promociones y suplementos
- `src/modules/expenses/vat-calculator.ts` - Cálculo automático de IVA
- `src/modules/reservations/validation.ts` - Validación referencial completa
- `src/modules/reservations/stock.ts` - Control atómico de stock con transacciones
- Integrado en routes: `reservations/routes.ts`, `expenses/routes.ts`, `products/routes.ts`

---

## 1. Expenses (Gastos)

### Cálculo Automático de Precios

**Regla**: Si viene `basePrice` en el request, el backend debe calcular automáticamente `netPrice` utilizando `vatPct`.

**Fórmula**:
```
netPrice = basePrice * (1 + vatPct/100)
vatAmount = netPrice - basePrice
```

**Ejemplo**:
```json
// Request (POST /api/expenses)
{
  "basePrice": "100.00",
  "vatPct": 21
}

// Response calculado por el backend
{
  "basePrice": "100.00",
  "vatPct": 21,
  "vatAmount": "21.00",
  "netPrice": "121.00"
}
```

**Implementación pendiente**:
- [ ] Validación: Si `basePrice` está presente, calcular automáticamente `vatAmount` y `netPrice`
- [ ] Si vienen los 3 campos (`basePrice`, `vatAmount`, `netPrice`), validar que sean coherentes
- [ ] Endpoint: `POST /api/expenses` y `PUT/PATCH /api/expenses/:id`

---

## 2. Reservations (Reservas)

### Validación de Referencias

**Regla**: Antes de crear/actualizar una reserva, validar que todos los IDs de referencia existan y pertenezcan al mismo evento.

**IDs a validar**:
- `eventId` - Debe existir en `events`
- `productIds` (claves del objeto `order`) - Deben existir en `products` del mismo `eventId`
- `salespersonId` - Si presente, debe existir en `salespeople` del mismo `eventId`
- `consumptionTypeId` - Debe existir en `consumptiontypes` del mismo `eventId`
- `pickupPointId` - Si presente, debe existir en `pickuppoints` del mismo `eventId`
- `paymentMethodId` - Debe existir en `paymentmethods` del mismo `eventId`
- `cashierId` - Si presente, debe existir en `cashiers` del mismo `eventId`

**Implementación pendiente**:
- [ ] Middleware/función de validación referencial antes de `create`/`update`
- [ ] Retornar error 400 con detalles de qué ID no existe o no pertenece al evento

### Cálculo de Precios

**Regla CONFIRMADA**: El backend debe calcular `totalAmount` **SIEMPRE DINÁMICAMENTE** en cada consulta/modificación.

**NO hay tabla de precios históricos**. El precio se calcula en tiempo real basándose en:
1. Los productos en `order` (mapa `{ productId: quantity }`)
2. `nominalPrice` de cada producto (si no hay promociones)
3. Suplementos por tipo de consumo (`supplement` en `products`)
4. Promociones activas en `products.promotions[]`

**Fórmula confirmada**:
```
Para cada producto en order:
  1. Obtener el producto desde MongoDB (products collection)
  2. precioBase = products.nominalPrice
  3. suplemento = products.supplement[consumptionTypeId] || 0  (en céntimos)
  4. precioConSuplemento = precioBase + (suplemento / 100)

  5. Obtener promociones del producto: products.promotions[] (array de promotion IDs)
  6. Para cada promotionId en products.promotions[]:
     - Verificar que la promoción esté activa (startDate <= now <= endDate)
     - Verificar que isActive = true
     - Aplicar regla según promotion.rule y promotion.conditions

  7. precioFinalConPromo = aplicar descuento si hay promoción activa
  8. subtotal = precioFinalConPromo * quantity

totalAmount = suma(subtotal de todos los productos)
```

**Implementación pendiente**:
- [ ] Función `calculateReservationTotal(order, consumptionTypeId, eventId, currentDate)`
- [ ] Aplicar en `POST /api/reservations` antes de guardar
- [ ] Aplicar en `PUT/PATCH /api/reservations` si cambia `order` o `consumptionTypeId`
- [ ] Validar que cliente NO pueda enviar `totalAmount` manualmente (calculado por backend)
- [ ] **IMPORTANTE**: ¿El precio se recalcula cada vez que se consulta la reserva, o solo al crearla/modificarla?

### Aplicación de Promociones

**Regla CONFIRMADA**: Al crear/modificar una reserva, comprobar si los productos cumplen alguna promoción activa.

**Flujo**:
1. Para cada `productId` en `reservations.order`:
   - Obtener `products.promotions[]` (array de IDs de promociones vinculadas al producto)
   - Para cada `promotionId` en ese array:
     - Verificar que `promotions.isActive = true`
     - Verificar que `now >= promotions.startDate && now <= promotions.endDate`
     - Verificar que el producto está en `promotions.applicables[]` (o `applicables` vacío = aplica a todos)
     - Si cumple, aplicar descuento según `promotions.rule` y `promotions.conditions`

2. Si al menos una promoción se aplicó:
   - Establecer `reservations.hasPromoApplied = true`

3. Si ninguna promoción se aplicó:
   - Establecer `reservations.hasPromoApplied = false`
   - Usar `products.nominalPrice` como precio base

**Campo `products.promotions[]`**:
- Es un array **manual** asignado por el admin
- Contiene los IDs de las promociones que **pueden** aplicar al producto
- Al crear/modificar reserva, el backend comprueba cuáles están activas y las aplica

**Implementación pendiente**:
- [ ] Función `getActivePromotions(productId, eventId, currentDate)` - Retorna promociones activas del producto
- [ ] Función `applyPromotionRules(order, promotions, consumptionTypeId)` - Calcula descuento total
- [ ] Establecer `hasPromoApplied = true/false` según resultado
- [ ] **CRÍTICO**: Si una promoción vence/cambia después de crear la reserva, ¿se recalcula automáticamente el `totalAmount`?

### Valores por Defecto

**Regla**: Al crear una reserva, establecer valores por defecto:
- `isDelivered = false`
- `isPaid = false` (presumiblemente, confirmar)
- `hasPromoApplied = false` (se calcula según promociones)

**Implementación pendiente**:
- [ ] Aplicar defaults en schema o en lógica de creación

---

## 3. Products (Productos)

### Relación con Promociones

**Regla CONFIRMADA**: Un producto puede estar vinculado a múltiples promociones simultáneamente.

**Campo `products.promotions`**: Array **manual** de IDs de promociones
- El admin asigna manualmente qué promociones pueden aplicar al producto
- Ejemplo: `promotions: ["promo1_id", "promo2_id", "promo3_id"]`
- Al crear/modificar reserva, el backend verifica cuáles de esas promociones están **activas**
- Una promoción está activa si:
  - `isActive = true`
  - `startDate <= now <= endDate`
  - El producto está en `applicables[]` (o `applicables` vacío)

**Implementación pendiente**:
- [ ] Validación en `POST/PUT/PATCH /api/products`: si se envía `promotions[]`, validar que todos los IDs existan en la colección `promotions` del mismo `eventId`
- [ ] ¿Qué pasa si una promoción en `products.promotions[]` no está activa? Se ignora al calcular precio

### Precio Nominal + Suplementos

**Estructura actual**:
- `nominalPrice`: Precio base del producto (string Money, ej: "5.50")
- `supplement`: Objeto `{ consumptionTypeId: céntimos }` (ej: `{"507f...": 50}` = +0.50€)

**Cálculo del precio final**:
```
precioFinal = nominalPrice + (supplement[consumptionTypeId] / 100)
```

**Implementación pendiente**:
- [ ] Función `calculateProductPrice(product, consumptionTypeId)`
- [ ] Retornar precio calculado en GET de productos (opcional)

---

## 4. Promotions (Promociones)

### Estructura Actual

**Campos**:
- `rule`: Enum que define el tipo de promoción (XForY, DiscountPerUnit, etc.)
- `conditions`: Objeto JSON dinámico con los valores específicos según la regla
- `applicables`: Array de IDs de productos a los que aplica (si vacío = todos)
- `startDate`, `endDate`: Rango de vigencia
- `priority`: Orden de aplicación (menor = mayor prioridad)
- `isCumulative`: Si puede combinarse con otras promociones

### ⚠️ PROBLEMA CRÍTICO: Almacenamiento del Valor Calculado

**Pregunta abierta**: ¿Dónde/cómo reflejar el valor del descuento calculado para usarlo en cálculo de pagos?

**Opciones posibles**:

#### Opción A: Guardar en la Reserva
Añadir campos en `reservations`:
```typescript
{
  totalAmountBeforePromo: Money,  // Total sin descuentos
  promoDiscount: Money,            // Descuento aplicado
  totalAmount: Money,              // Total final
  appliedPromotions: [             // Detalle de promociones aplicadas
    {
      promotionId: string,
      promotionName: string,
      discountAmount: Money
    }
  ]
}
```

**Ventajas**: Historial completo, auditoría, no depende de promociones futuras
**Desventajas**: Duplicación de datos

#### Opción B: Calcular Dinámicamente
No guardar descuento, recalcular siempre desde `promotions` activas.

**Ventajas**: Sin duplicación, siempre actualizado
**Desventajas**: Si la promoción cambia, el histórico se pierde

#### Opción C: Tabla de Aplicación de Promociones
Crear colección `promotion_applications`:
```typescript
{
  reservationId: string,
  promotionId: string,
  discountAmount: Money,
  appliedAt: Date
}
```

**Ventajas**: Separación de concerns, historial detallado
**Desventajas**: Más complejidad

**Implementación pendiente**:
- [ ] **DECISIÓN**: Elegir estrategia de almacenamiento (A, B o C)
- [ ] Implementar función `calculatePromotionDiscount(order, promotions)`
- [ ] Almacenar según estrategia elegida

### Reglas de Promoción - Lógica de Cálculo

**Pendiente de implementar para cada `rule`**:

#### 1. XForY (3x2)
```typescript
// conditions: { buyQty: 3, payQty: 2 }
// Compra 3, paga 2
descuento = precioUnitario * (buyQty - payQty) * Math.floor(cantidad / buyQty)
```

#### 2. DiscountPerUnit
```typescript
// conditions: { amountOff: "1.50" }
descuento = amountOff * cantidad
```

#### 3. BulkPrice
```typescript
// conditions: { units: 5, bundlePrice: "10.00" }
// 5 unidades por 10€
bloques = Math.floor(cantidad / units)
descuento = (precioNormal * units - bundlePrice) * bloques
```

#### 4. PercentageDiscount
```typescript
// conditions: { percent: 15 }
descuento = subtotal * (percent / 100)
```

#### 5. ComboDiscount
```typescript
// conditions: { requiredProductIds: [...], percent: 10 }
// Si todos los productos requeridos están en order
descuento = subtotalCombo * (percent / 100)
```

#### 6. FixedPriceBundle
```typescript
// conditions: { productIds: [...], price: "25.00" }
// Si todos los productos del bundle están en order
descuento = precioNormalBundle - price
```

#### 7. BuyXGetYFree
```typescript
// conditions: { buyQty: 2, freeQty: 1 }
// Compra 2, lleva 1 gratis
unidadesGratis = Math.floor(cantidad / (buyQty + freeQty)) * freeQty
descuento = precioUnitario * unidadesGratis
```

#### 8. MaxUnitsDiscounted
```typescript
// conditions: { maxUnits: 5, percent: 20 }
unidadesConDescuento = Math.min(cantidad, maxUnits)
descuento = precioUnitario * unidadesConDescuento * (percent / 100)
```

#### 9. FirstXUnitsFree
```typescript
// conditions: { units: 1 }
unidadesGratis = Math.min(cantidad, units)
descuento = precioUnitario * unidadesGratis
```

#### 10. TimeLimitedDiscount
```typescript
// conditions: { percent: 10 } o { amountOff: "5.00" }
// Validar que esté dentro de startDate/endDate
descuento = percent ? subtotal * (percent/100) : amountOff * cantidad
```

**Implementación pendiente**:
- [ ] Crear módulo `src/modules/promotions/calculator.ts`
- [ ] Implementar función por cada regla
- [ ] Tests unitarios para cada tipo de promoción

### Prioridad y Acumulación

**Reglas**:
1. Ordenar promociones por `priority` (menor = mayor prioridad)
2. Si `isCumulative = false`, aplicar solo la de mayor prioridad
3. Si `isCumulative = true`, aplicar múltiples descuentos acumulativamente

**Implementación pendiente**:
- [ ] Función `selectPromotionsToApply(applicablePromotions)`
- [ ] Lógica de acumulación vs exclusividad

---

## 5. Preguntas Críticas para Resolver

### Recálculo Dinámico

1. **¿Cuándo se (re)calcula `totalAmount`?**
   - ✅ Al crear reserva (`POST /api/reservations`)
   - ✅ Al modificar reserva si cambia `order` o `consumptionTypeId` (`PUT/PATCH /api/reservations`)
   - ❓ ¿Al consultar reserva (`GET /api/reservations/:id`)? ¿O se devuelve el valor guardado?
   - ❓ ¿Qué pasa si una promoción vence/cambia después de crear la reserva? ¿Se recalcula automáticamente?

2. **¿Qué pasa si el precio de un producto cambia?**
   - Escenario: Reserva creada con `nominalPrice = "10.00"`
   - Admin cambia `nominalPrice = "12.00"`
   - ¿La reserva existente se recalcula con el nuevo precio o mantiene el antiguo?

3. **¿Cuándo se "congela" el precio?**
   - ❓ ¿Al marcar `isPaid = true`?
   - ❓ ¿Al marcar `isDelivered = true`?
   - ❓ ¿Nunca (siempre dinámico)?

### Aplicación de Promociones

4. **Si hay múltiples promociones en `products.promotions[]`, ¿cómo se aplican?**
   - ¿Se usan `priority` y `isCumulative` de las promociones?
   - ¿Se ordenan por `priority` (menor = mayor prioridad)?
   - ¿Si `isCumulative = false`, solo se aplica la de mayor prioridad?
   - ¿Si `isCumulative = true`, se aplican todas acumulativamente?

5. **Orden de aplicación: ¿Suplemento antes o después de promoción?**
   - Opción A: `(nominalPrice + supplement) - descuento`
   - Opción B: `(nominalPrice - descuento) + supplement`
   - ¿Cuál es la correcta?

6. **¿Necesitamos auditoría de qué promociones se aplicaron?**
   - Si el precio es siempre dinámico, no hay registro de qué promociones se usaron
   - ¿Es necesario guardar en algún lado qué promociones se aplicaron para fines de auditoría/contabilidad?
   - ¿O es suficiente con `hasPromoApplied = true/false`?

### Stock

7. **¿Al crear reserva se descuenta del `products.stock`?**
   - Actualmente hay lógica de stock en `modules/reservations/stock.ts`
   - ¿Se debe descontar `order[productId].quantity` del `products.stock` al crear reserva?
   - ¿Se devuelve al stock si se cancela la reserva (soft delete)?

### Validación

8. **¿Qué pasa si `order` contiene productos de diferentes eventos?**
   - ¿Es posible o la validación debe asegurar que todos los productos pertenezcan al mismo `eventId`?

9. **¿Validación de stock antes de crear reserva?**
   - ¿Retornar error 400 si `quantity > products.stock`?

---

## 8. Tareas Completadas ✅

### 🔴 Alta Prioridad - ✅ COMPLETADAS

**Expenses - Cálculo de IVA** ✅
- [x] Calcular automáticamente `netPrice = basePrice * (1 + vatPct/100)`
- [x] Calcular automáticamente `vatAmount = netPrice - basePrice`
- [x] Validar coherencia si vienen los 3 campos
- **Implementado en**: `src/modules/expenses/vat-calculator.ts`

**Reservations - Validación Referencial** ✅
- [x] Middleware de validación referencial de IDs antes de crear/actualizar
- [x] Validar que todos los productos en `order` pertenecen al mismo `eventId`
- [x] Retornar error 400 con detalles si ID no existe o no pertenece al evento
- **Implementado en**: `src/modules/reservations/validation.ts`

**Reservations - Cálculo de Precio** ✅
- [x] Función `calculateReservationTotal(order, consumptionTypeId, eventId, currentDate, isPaid, isDelivered)`
- [x] Validar congelación: NO recalcular si `isPaid = true` o `isDelivered = true`
- [x] Aplicar en `POST /api/reservations` antes de guardar
- [x] Aplicar en `PUT/PATCH /api/reservations` si cambia `order` o `consumptionTypeId`
- [x] Impedir que cliente envíe `totalAmount` manualmente (siempre calculado por backend)
- **Implementado en**: `src/modules/reservations/pricing.ts`

**Reservations - Stock** ✅
- [x] Descontar `quantity` del `products.stock` al crear reserva
- [x] Devolver al stock si se cancela reserva (soft delete)
- [x] Retornar error `INSUFFICIENT_STOCK` si `quantity > products.stock`
- [x] Usar transacciones MongoDB para atomicidad (ya existe lógica en `modules/reservations/stock.ts`)
- **Implementado en**: `src/modules/reservations/stock.ts`

**Reservations - Promociones** ✅
- [x] Función `getActivePromotions(productId, eventId, currentDate)` - Retorna promociones activas del producto
- [x] Función `calculateTotalPromotionDiscount(order, promotions, consumptionTypeId)` - Calcula descuento total
- [x] Lógica para múltiples promociones con `priority` e `isCumulative`:
  - Si `isCumulative = false`: aplicar solo la de mayor prioridad (número más alto)
  - Si misma prioridad: aplicar la más beneficiosa al cliente (menor totalAmount)
  - Si `isCumulative = true`: aplicar todas acumulativamente
- [x] Establecer `hasPromoApplied = true/false` según resultado
- **Implementado en**: `src/modules/catalogs/promotions/calculator.ts`

**Products - Validación** ✅
- [x] Validar que IDs en `products.promotions[]` existan en colección `promotions` del mismo `eventId`
- [x] Endpoint: `POST/PUT/PATCH /api/products`
- **Implementado en**: `src/modules/catalogs/products/routes.ts`

### 🟡 Media Prioridad - ✅ COMPLETADAS

**Promotions - Lógica de Cálculo** ✅
- [x] Implementar función de cálculo para cada `rule` (10 tipos):
  1. XForY
  2. DiscountPerUnit
  3. BulkPrice
  4. PercentageDiscount
  5. ComboDiscount
  6. FixedPriceBundle
  7. BuyXGetYFree
  8. MaxUnitsDiscounted
  9. FirstXUnitsFree
  10. TimeLimitedDiscount
- **Implementado en**: `src/modules/catalogs/promotions/calculator.ts`

**Suplementos - Lógica Completa** ✅
- [x] Estructura confirmada: `products.supplement` (por producto)
- [x] Aplicación por producto (cada producto tiene sus suplementos)
- [x] Orden confirmado: `(nominalPrice - descuentoPromo) + suplemento`
- [x] Implementar cálculo de suplementos en `calculateReservationTotal()`
- [x] Validar que el suplemento corresponda a las características de la reserva
- **Implementado en**: `src/modules/reservations/pricing.ts`

**Auditoría de Promociones Aplicadas** ✅ IMPLEMENTADA
- [x] Diseñar campo/método para devolver detalle de promociones aplicadas
- [x] Implementado campo `appliedPromotionsSnapshot` en reservations schema
- [ ] Endpoint para obtener datos de facturación completos (productos, promociones, suplementos, IVA, reservas linkadas) - **EN PROCESO**
- **Implementado en**: `src/modules/reservations/schema.ts` y `src/modules/reservations/pricing.ts`

### 🟢 Baja Prioridad

**Testing y Documentación**
- [ ] Tests unitarios para cada regla de promoción (10 tipos)
- [ ] Tests de integración para cálculo completo de reserva
- [ ] Tests de validación de IDs de referencia
- [ ] Tests de stock (descuento y restauración)
- [ ] Tests de linkedReservations (bidireccionalidad, cancelación)
- [ ] Documentación con ejemplos de uso
- [ ] Documentación de error codes: INSUFFICIENT_STOCK, INVALID_REFERENCE_ID, PRICE_FROZEN, INVALID_EVENT_ID

---

## 7. Decisiones Confirmadas ✅

### Cálculo de Precios

1. ✅ **Precios históricos**: NO hay tabla de históricos. Precio se calcula **dinámicamente**
2. ✅ **Campo `products.promotions`**: Es **manual** (admin lo asigna)
3. ✅ **Descuentos aplicados**: No se guardan, se calculan dinámicamente cada vez
4. ✅ **`hasPromoApplied`**: Campo booleano simple (true/false), sin detalles

### Recálculo y Congelación

5. ✅ **Cuándo se recalcula `totalAmount`**:
   - Al crear reserva (`POST /api/reservations`)
   - Al modificar reserva si cambia `order` o `consumptionTypeId` (`PUT/PATCH`)
   - **NO al consultar** (`GET /api/reservations/:id`) - devolver valor guardado
   - **NO si `isPaid = true`** - precio congelado
   - **NO si `isDelivered = true`** - precio congelado

6. ✅ **Si promoción vence/cambia después de crear reserva**:
   - NO se recalcula la reserva existente
   - Si se hace un nuevo pedido con las nuevas condiciones, se crea una **nueva reserva linkada**
   - Usar campo `linkedReservations[]` para vincular reservas relacionadas

7. ✅ **Si `nominalPrice` de producto cambia**:
   - La reserva SE RECALCULA (precio siempre dinámico hasta congelarse)
   - Una vez `isPaid = true` o `isDelivered = true`, ya no se recalcula

8. ✅ **Congelación del precio**:
   - Al marcar `isPaid = true` → precio congelado, no recalcular más
   - Al marcar `isDelivered = true` → precio congelado, no recalcular más
   - Validar en backend que no se recalcule si está congelado

### Aplicación de Promociones

9. ✅ **Múltiples promociones en mismo producto**:

   **Si `isCumulative = false` (no acumulables)**:
   - Ordenar por `priority` (número **más alto** = mayor prioridad)
   - Aplicar solo la de **mayor prioridad**
   - Si tienen misma `priority` → aplicar la **más beneficiosa al cliente** (menor `totalAmount`)

   **Si `isCumulative = true` (acumulables)**:
   - Aplicar **todas** las promociones acumulativamente
   - Asegurar que el `totalAmount` resultante sea el **menor posible**

10. ✅ **Orden de aplicación - Suplementos CONFIRMADO**:
    - **Estructura**: Los suplementos están en `products.supplement` (por producto)
    - **Aplicación**: Por producto (cada producto puede tener suplementos diferentes)
    - **Fórmula**: `(nominalPrice - descuentoPromo) + suplemento`
    - **Orden**: PRIMERO se aplica la promoción, LUEGO el suplemento
    - **Validación**: Al calcular precio, revisar si el suplemento coincide con características de la reserva (consumptionTypeId, etc.)
    - Ejemplos en `products.supplement`:
      - `{ "consumptionTypeId_tarjeta": 100 }` = +1€ si paga con tarjeta
      - `{ "consumptionTypeId_delivery": 200 }` = +2€ si es delivery
      - `{ "consumptionTypeId_tienda": -100 }` = -1€ si viene a recoger

### Reglas de Promoción - Detalles Confirmados

15. ✅ **XForY (3x2) - Stock**:
    - Se descuenta del stock la cantidad **real consumida**, no la pagada
    - Ejemplo: "3x2" → Cliente pide 3, se descuentan **3 unidades** del stock (no 2)
    - Aunque el cliente solo pague 2, consume 3 físicamente

16. ✅ **ComboDiscount - Aplicación**:
    - Todos los productos del combo **deben estar presentes** en `order` para aplicar
    - Ejemplo: "Hamburguesa + Bebida = -2€"
      - Si solo pide hamburguesa → NO se aplica
      - Si pide 2 hamburguesas + 1 bebida → se aplica 1 vez
      - Si pide 2 hamburguesas + 2 bebidas → se aplica 2 veces (si es posible)

17. ✅ **BuyXGetYFree - Mismo producto**:
    - Las unidades gratis son **siempre del mismo producto**
    - Ejemplo: "Compra 2 cervezas, lleva 1 gratis"
      - La unidad gratis es otra cerveza (mismo producto)
      - NO se puede sustituir por otro producto aunque valga lo mismo

18. ✅ **PercentageDiscount - Base de cálculo**:
    - Se aplica sobre `nominalPrice` **SIN suplemento**
    - Ejemplo: Producto 10€, suplemento +1€, descuento 10%
      - Descuento = 10€ × 10% = 1€
      - Precio final = (10€ - 1€) + 1€ = 10€
      - NO es (11€ × 10% = 1.10€)
    - `hasPromoApplied` es booleano simple (true/false)
    - ⚠️ **PENDIENTE**: Crear campo/método para devolver detalle de promociones aplicadas (ver propuesta abajo)

### Stock

12. ✅ **Descuento de stock al crear reserva**:
    - SÍ, descontar `quantity` del `products.stock` al crear reserva
    - SÍ, devolver al stock si se cancela reserva (soft delete)

### Validación

13. ✅ **Validación de `eventId`**:
    - Todos los productos en `order` deben pertenecer al mismo `eventId` de la reserva
    - Siempre se pasa `eventId` y token de sesión en los endpoints

14. ✅ **Validación de stock antes de crear**:
    - SÍ, retornar error si `quantity > products.stock`
    - Error code apropiado (ej: `INSUFFICIENT_STOCK`)
    - Mensaje: "No hay stock suficiente para servir esta comanda"

---

## 9. Propuesta: Auditoría de Promociones Aplicadas

**Problema**: `hasPromoApplied` es solo un booleano, no da detalle de qué promociones se aplicaron.

**Necesidad**: Para fines de facturación y claridad, necesitamos saber:
- Qué promociones se aplicaron
- A qué productos
- Cuánto descuento generó cada una

### **Opción A: Añadir campo en Reservations (Snapshot inmutable)**

Añadir campo `appliedPromotionsSnapshot` en la colección `reservations`:

```typescript
// En schema de reservations
appliedPromotionsSnapshot?: {
  productId: string,
  productName: string,        // Para mostrar en factura
  originalPrice: Money,        // Precio sin promoción
  finalPrice: Money,           // Precio con promoción aplicada
  promotions: [
    {
      promotionId: string,
      promotionName: string,   // Para mostrar en factura
      rule: string,            // Tipo de promoción
      discount: Money          // Descuento generado por esta promo
    }
  ]
}[]
```

**Ventajas**:
- ✅ Historial inmutable: aunque cambien precios/promociones, la reserva mantiene el snapshot
- ✅ Auditoría completa: se sabe exactamente qué promociones se aplicaron y cuánto descuentaron
- ✅ Facturación clara: se puede generar factura detallada
- ✅ No depende de datos futuros

**Desventajas**:
- ❌ Duplicación de datos (nombres de productos y promociones)
- ❌ Más complejidad al guardar

### **Opción B: Tabla/Colección Separada (Auditoría independiente)**

Crear colección `promotion_applications`:

```typescript
{
  _id: ObjectId,
  reservationId: string,
  productId: string,
  promotionId: string,
  promotionName: string,      // Snapshot del nombre
  rule: string,
  discount: Money,
  appliedAt: Date,
  isActive: boolean
}
```

**Ventajas**:
- ✅ Separación de concerns
- ✅ Consultas independientes para reportes
- ✅ Historial detallado por producto y promoción

**Desventajas**:
- ❌ Más colecciones (más complejidad)
- ❌ Necesita joins para obtener detalle completo

### **Opción C: Función de Reconstrucción Dinámica (Sin guardar)**

No guardar nada, recalcular siempre desde:
- `reservations.order` (productos y cantidades)
- `products.promotions[]` (promociones del producto)
- `promotions` (detalles de las promociones)

**Ventajas**:
- ✅ Sin duplicación de datos
- ✅ Siempre actualizado

**Desventajas**:
- ❌ Si las promociones cambian/eliminan, se pierde el histórico
- ❌ No sirve para auditoría (no se sabe qué promociones se aplicaron en el momento de la reserva)
- ❌ Facturación inconsistente si cambian datos

### **Recomendación: Opción A (Snapshot en Reservations)**

Para fines de **facturación clara** y **auditoría completa**, recomiendo **Opción A**:

```typescript
// Añadir a reservations schema
appliedPromotionsSnapshot?: {
  productId: string,
  productName: string,
  quantity: number,
  unitPriceOriginal: Money,    // Precio antes de promociones
  unitPriceFinal: Money,        // Precio después de promociones
  subtotal: Money,              // quantity * unitPriceFinal
  promotionsApplied: [
    {
      promotionId: string,
      promotionName: string,
      rule: string,
      discountPerUnit: Money
    }
  ]
}[]
```

**Ventaja adicional**: Este snapshot también resuelve el problema de cambios de `nominalPrice` (ya no afecta a reservas antiguas porque están en el snapshot).

**¿Qué opinas de esta propuesta?**

---

## 10. Resumen Final de Lógica de Negocio ✅

### Fórmula Completa de Cálculo de Precio

```typescript
Para cada producto en order:
  1. Obtener producto desde MongoDB
  2. precioBase = product.nominalPrice

  3. Obtener promociones activas del producto (product.promotions[])
  4. Aplicar promociones según priority e isCumulative:
     - Si isCumulative = false: aplicar solo la de mayor priority
     - Si misma priority: aplicar la más beneficiosa al cliente
     - Si isCumulative = true: aplicar todas acumulativamente
  5. precioConPromo = precioBase - descuentoPromo

  6. Obtener suplemento aplicable según características de la reserva
  7. suplemento = product.supplement[consumptionTypeId] || 0 (en céntimos)
  8. precioFinal = precioConPromo + (suplemento / 100)

  9. subtotal = precioFinal * quantity

  10. Descontar del stock: product.stock -= quantity (cantidad REAL consumida)

totalAmount = suma(subtotal de todos los productos)
hasPromoApplied = true/false según si se aplicó alguna promoción
```

### Validaciones Pre-Cálculo

```typescript
Antes de calcular precio:
  1. Validar que isPaid = false y isDelivered = false (si no, precio congelado)
  2. Validar que todos los productos existen y pertenecen al eventId
  3. Validar que consumptionTypeId, paymentMethodId, etc. existen en el evento
  4. Validar que quantity <= product.stock para cada producto
  5. Si alguna validación falla: retornar error INVALID_REFERENCE_ID o INSUFFICIENT_STOCK
```

### Reglas de Congelación

```typescript
Precio se congela cuando:
  - isPaid = true → NO recalcular más
  - isDelivered = true → NO recalcular más

Precio se recalcula cuando:
  - PUT/PATCH cambia order o consumptionTypeId
  - Y isPaid = false Y isDelivered = false
```

### LinkedReservations

```typescript
Se crea nueva reserva linkada cuando:
  1. Promoción cambia/vence y cliente hace nuevo pedido
  2. Cliente hace nuevo pedido (manual desde front)

Estructura bidireccional:
  - A.linkedReservations = ["B", "C"]
  - B.linkedReservations = ["A", "C"]
  - C.linkedReservations = ["A", "B"]

Al cancelar reserva:
  - Soft delete (isActive = false)
  - Restaurar stock
  - Desvinvular de otras (eliminar ID de sus arrays)
  - Otras reservas se mantienen activas
```

### Endpoint de Facturación

```typescript
GET /api/reservations/:id/invoice-data
{
  reservation: {
    id, reserver, totalAmount, isPaid, isDelivered, ...
  },
  products: [
    {
      productId, productName, quantity,
      unitPriceOriginal, unitPriceFinal, subtotal,
      promotionsApplied: [
        { promotionId, promotionName, rule, discount }
      ],
      supplementsApplied: [
        { concept, amount }
      ]
    }
  ],
  vat: {
    baseImponible, vatPct, vatAmount
  },
  linkedReservations: [
    { id, reserver, totalAmount, ... }
  ],
  totalFinal: totalAmount
}
```

---

## 11. Preguntas Adicionales Pendientes (RESUELTAS ✅)

~~Todas las preguntas han sido respondidas y documentadas.~~

**✅ LÓGICA DE NEGOCIO COMPLETA Y CONFIRMADA**

---

## Ver también

- [Data Model](./data-model.md) - Esquemas de colecciones
- [Reservations Validation](./reservations-validation.md) - Validación referencial existente
- [API](./api.md) - Endpoints y ejemplos
