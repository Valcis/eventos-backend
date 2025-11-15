# Códigos de Error - API Eventos

Este documento describe todos los códigos de error que puede devolver la API y cómo manejarlos.

## Formato de Respuesta de Error

Todas las respuestas de error siguen este formato consistente:

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "Descripción del error",
	"details": {
		"campo": "valor"
	}
}
```

## Códigos de Error por Categoría

### 🔴 Errores de Autenticación (401)

| Código             | Descripción                                 | Solución                                      |
| ------------------ | ------------------------------------------- | --------------------------------------------- |
| `UNAUTHORIZED`     | Falta el token Bearer en la petición        | Añadir header `Authorization: Bearer <token>` |
| `TOKEN_EXPIRED`    | El token JWT ha expirado                    | Obtener un nuevo token (login/refresh)        |
| `INVALID_TOKEN`    | El token JWT es inválido o está mal formado | Verificar que el token es correcto            |
| `TOKEN_NOT_ACTIVE` | El token aún no está activo (nbf claim)     | Esperar o verificar la fecha del token        |

**Ejemplo:**

```json
{
	"statusCode": 401,
	"code": "TOKEN_EXPIRED",
	"error": "Unauthorized",
	"message": "Token expirado"
}
```

---

### ⚠️ Errores de Validación (400)

| Código               | Descripción                             | Detalles                             |
| -------------------- | --------------------------------------- | ------------------------------------ |
| `VALIDATION_ERROR`   | Datos enviados no cumplen el schema Zod | Incluye array de errores por campo   |
| `INVALID_ID`         | ID (ObjectId) no es válido              | Debe ser 24 caracteres hexadecimales |
| `FST_ERR_VALIDATION` | Error de validación de Fastify          | Error en formato o tipo de datos     |

**Ejemplo de validación Zod:**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "Error de validación en los datos enviados",
	"details": [
		{
			"path": "name",
			"message": "String must contain at least 1 character(s)",
			"code": "too_small"
		},
		{
			"path": "date",
			"message": "Invalid datetime",
			"code": "invalid_string"
		}
	]
}
```

**Ejemplo de ObjectId inválido:**

```json
{
	"statusCode": 400,
	"code": "INVALID_ID",
	"error": "Bad Request",
	"message": "El ID proporcionado no es válido. Debe ser un ObjectId de MongoDB válido (24 caracteres hexadecimales).",
	"details": {
		"providedId": "abc123"
	}
}
```

---

### 🚫 Errores de Recurso (404)

| Código      | Descripción           | Cuándo ocurre                           |
| ----------- | --------------------- | --------------------------------------- |
| `NOT_FOUND` | Recurso no encontrado | GET/PUT/PATCH/DELETE con ID inexistente |

**Ejemplo:**

```json
{
	"statusCode": 404,
	"code": "NOT_FOUND",
	"error": "Not Found",
	"message": "Evento no encontrado con el ID proporcionado"
}
```

---

### ⚔️ Errores de Conflicto (409)

| Código            | Descripción                               | Detalles                        |
| ----------------- | ----------------------------------------- | ------------------------------- |
| `DUPLICATE_ENTRY` | Ya existe un registro con ese valor único | Incluye campo y valor duplicado |

**Ejemplo:**

```json
{
	"statusCode": 409,
	"code": "DUPLICATE_ENTRY",
	"error": "Conflict",
	"message": "Ya existe un registro con ese valor (campo: name): \"Cerveza\". Por favor usa un valor diferente.",
	"details": {
		"field": "name",
		"value": "Cerveza"
	}
}
```

---

### 💥 Errores Internos del Servidor (500)

| Código           | Descripción                   | Acción                          |
| ---------------- | ----------------------------- | ------------------------------- |
| `INTERNAL_ERROR` | Error inesperado del servidor | Contactar soporte, revisar logs |
| `FST_ERR_*`      | Error interno de Fastify      | Revisar logs del servidor       |

**Ejemplo:**

```json
{
	"statusCode": 500,
	"code": "INTERNAL_ERROR",
	"error": "Internal Server Error",
	"message": "Error interno del servidor",
	"stack": "..." // Solo en development
}
```

---

## Errores por Endpoint

### POST /api/events (Crear Evento)

| Código                 | Cuándo                                                     | Solución                       |
| ---------------------- | ---------------------------------------------------------- | ------------------------------ |
| 400 `VALIDATION_ERROR` | Datos inválidos (nombre vacío, fecha mal formateada, etc.) | Revisar schema en Swagger      |
| 401 `UNAUTHORIZED`     | Sin token o token inválido                                 | Autenticarse correctamente     |
| 409 `DUPLICATE_ENTRY`  | Ya existe un evento con ese nombre y fecha                 | Usar nombre o fecha diferentes |
| 500 `INTERNAL_ERROR`   | Error del servidor                                         | Contactar soporte              |

### GET /api/events/:id (Obtener Evento)

| Código               | Cuándo                     | Solución                                 |
| -------------------- | -------------------------- | ---------------------------------------- |
| 400 `INVALID_ID`     | ID mal formado             | Usar ObjectId válido (24 caracteres hex) |
| 401 `UNAUTHORIZED`   | Sin token o token inválido | Autenticarse correctamente               |
| 404 `NOT_FOUND`      | Evento no existe           | Verificar el ID                          |
| 500 `INTERNAL_ERROR` | Error del servidor         | Contactar soporte                        |

### PUT /api/events/:id (Reemplazar Evento)

| Código                 | Cuándo                     | Solución                   |
| ---------------------- | -------------------------- | -------------------------- |
| 400 `VALIDATION_ERROR` | Datos inválidos            | Revisar schema en Swagger  |
| 400 `INVALID_ID`       | ID mal formado             | Usar ObjectId válido       |
| 401 `UNAUTHORIZED`     | Sin token o token inválido | Autenticarse correctamente |
| 404 `NOT_FOUND`        | Evento no existe           | Verificar el ID            |
| 409 `DUPLICATE_ENTRY`  | Nuevo nombre duplicado     | Usar nombre diferente      |
| 500 `INTERNAL_ERROR`   | Error del servidor         | Contactar soporte          |

### PATCH /api/events/:id (Actualizar Parcial)

| Código                 | Cuándo                     | Solución                   |
| ---------------------- | -------------------------- | -------------------------- |
| 400 `VALIDATION_ERROR` | Datos inválidos            | Revisar schema en Swagger  |
| 400 `INVALID_ID`       | ID mal formado             | Usar ObjectId válido       |
| 401 `UNAUTHORIZED`     | Sin token o token inválido | Autenticarse correctamente |
| 404 `NOT_FOUND`        | Evento no existe           | Verificar el ID            |
| 500 `INTERNAL_ERROR`   | Error del servidor         | Contactar soporte          |

### DELETE /api/events/:id (Soft Delete)

| Código             | Cuándo                     | Solución                   |
| ------------------ | -------------------------- | -------------------------- |
| 400 `INVALID_ID`   | ID mal formado             | Usar ObjectId válido       |
| 401 `UNAUTHORIZED` | Sin token o token inválido | Autenticarse correctamente |
| 404 `NOT_FOUND`    | Evento no existe           | Verificar el ID            |
| 204 **(Success)**  | Borrado exitoso            | Sin contenido en respuesta |

---

### 💰 Errores de Lógica de Negocio - Pricing (400)

**Añadido en la implementación de Pricing Logic**

| Código                    | Descripción                                                 | Cuándo ocurre                                   |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| `INSUFFICIENT_STOCK`      | No hay stock suficiente para completar la reserva           | Al crear reserva con `quantity > stock`         |
| `PRICE_FROZEN`            | No se puede recalcular precio de reserva pagada/entregada   | PUT/PATCH en reserva con `isPaid` o `isDelivered` |
| `VALIDATION_ERROR` (IVA)  | Valores de IVA incoherentes (basePrice, vatAmount, netPrice) | POST/PUT/PATCH expenses con campos incoherentes |
| `VALIDATION_ERROR` (refs) | Referencias inválidas (productos, catálogos, promociones)   | POST/PUT/PATCH con IDs inexistentes             |

**Ejemplo - Stock insuficiente:**

```json
{
	"statusCode": 400,
	"code": "INSUFFICIENT_STOCK",
	"error": "Bad Request",
	"message": "Stock insuficiente para los siguientes productos:\nCerveza: solicitado 10, disponible 5\nHamburguesa: solicitado 20, disponible 15"
}
```

**Ejemplo - Precio congelado:**

```json
{
	"statusCode": 400,
	"code": "PRICE_FROZEN",
	"error": "Bad Request",
	"message": "No se puede recalcular el precio de una reserva pagada o entregada."
}
```

**Ejemplo - Validación de referencias:**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "Las siguientes promociones no existen o no pertenecen al evento: 507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012"
}
```

**Ejemplo - IVA incoherente:**

```json
{
	"statusCode": 400,
	"code": "VALIDATION_ERROR",
	"error": "Bad Request",
	"message": "Valores de IVA incoherentes. Esperado: basePrice=100.00, vatAmount=21.00, netPrice=121.00. Recibido: basePrice=100.00, vatAmount=20.00, netPrice=120.00"
}
```

---

### 📊 Errores Específicos por Endpoint - Pricing Logic

**POST /api/reservations (Crear Reserva)**

| Código                       | Cuándo                                                   | Solución                                 |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| 400 `VALIDATION_ERROR`       | Datos inválidos o referencias inexistentes               | Verificar IDs de productos, catálogos    |
| 400 `INSUFFICIENT_STOCK`     | Cantidad solicitada > stock disponible                   | Reducir cantidad o esperar reposición    |
| 404 `NOT_FOUND`              | Evento no existe                                         | Verificar eventId                        |
| 401 `UNAUTHORIZED`           | Sin token o token inválido                               | Autenticarse correctamente               |

**PUT/PATCH /api/reservations/:id (Actualizar Reserva)**

| Código                       | Cuándo                                                   | Solución                                 |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| 400 `PRICE_FROZEN`           | Intentar recalcular precio en reserva pagada/entregada   | No modificar `order` o `consumptionTypeId` |
| 400 `VALIDATION_ERROR`       | Referencias inválidas                                    | Verificar IDs                            |
| 400 `INSUFFICIENT_STOCK`     | Nuevo stock insuficiente al modificar order              | Reducir cantidad                         |
| 404 `NOT_FOUND`              | Reserva no existe                                        | Verificar ID                             |

**POST /api/expenses (Crear Gasto)**

| Código                       | Cuándo                                                   | Solución                                 |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| 400 `VALIDATION_ERROR`       | Valores de IVA incoherentes o datos inválidos            | Enviar solo basePrice+vatPct o netPrice+vatPct |
| 401 `UNAUTHORIZED`           | Sin token o token inválido                               | Autenticarse correctamente               |

**POST/PUT/PATCH /api/products (Gestionar Productos)**

| Código                       | Cuándo                                                   | Solución                                 |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| 400 `VALIDATION_ERROR`       | Promociones referenciadas no existen o no pertenecen al evento | Verificar IDs en `promotions[]`          |
| 401 `UNAUTHORIZED`           | Sin token o token inválido                               | Autenticarse correctamente               |
| 404 `NOT_FOUND`              | Producto no existe (PUT/PATCH)                           | Verificar ID                             |

**GET /api/reservations/:id/invoice-data (Datos de Facturación)**

| Código                       | Cuándo                                                   | Solución                                 |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| 404 `NOT_FOUND`              | Reserva no existe o está inactiva                        | Verificar ID de reserva                  |
| 401 `UNAUTHORIZED`           | Sin token o token inválido                               | Autenticarse correctamente               |
| 500 `INTERNAL_ERROR`         | Error al generar datos de facturación                    | Contactar soporte, revisar logs          |

---

## Manejo de Errores en el Cliente

### Ejemplo en JavaScript/TypeScript

```typescript
async function fetchEvent(id: string) {
	try {
		const response = await fetch(`/api/events/${id}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const error = await response.json();

			switch (error.code) {
				case 'NOT_FOUND':
					console.error('Evento no encontrado');
					break;
				case 'INVALID_ID':
					console.error('ID inválido:', error.details.providedId);
					break;
				case 'TOKEN_EXPIRED':
					console.error('Token expirado, renovando...');
					// Renovar token y reintentar
					break;
				case 'UNAUTHORIZED':
					console.error('No autenticado');
					// Redirigir a login
					break;
				default:
					console.error('Error:', error.message);
			}

			return null;
		}

		return await response.json();
	} catch (err) {
		console.error('Error de red:', err);
		return null;
	}
}
```

### Ejemplo con Axios

```typescript
import axios from 'axios';

axios.interceptors.response.use(
	(response) => response,
	(error) => {
		const { code, message, details } = error.response?.data || {};

		switch (code) {
			case 'TOKEN_EXPIRED':
				// Renovar token
				return refreshTokenAndRetry(error.config);

			case 'VALIDATION_ERROR':
				// Mostrar errores de validación
				showValidationErrors(details);
				break;

			case 'DUPLICATE_ENTRY':
				// Mostrar campo duplicado
				showError(`${details.field} ya existe: ${details.value}`);
				break;

			default:
				showError(message || 'Error desconocido');
		}

		return Promise.reject(error);
	},
);
```

---

## Stack Trace en Development

En modo `NODE_ENV=development`, las respuestas de error 500 incluyen el stack trace completo:

```json
{
	"statusCode": 500,
	"code": "INTERNAL_ERROR",
	"error": "Internal Server Error",
	"message": "Cannot read property 'name' of undefined",
	"stack": "Error: Cannot read property 'name' of undefined\n    at /app/src/modules/events/routes.ts:123:45\n    ..."
}
```

⚠️ **En producción**, el stack trace **NO** se incluye por seguridad.

---

## Ver También

- [API Documentation](./api.md) - Contratos completos de la API
- [Architecture](./architecture.md) - Arquitectura del sistema
- [Security](./security.md) - Seguridad y autenticación
