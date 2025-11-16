#!/usr/bin/env tsx
/**
 * Script para generar documentación API en Markdown
 *
 * Genera documentación completa basada en la estructura actual del proyecto
 * sin necesidad de levantar el servidor o conectarse a MongoDB.
 *
 * Uso:
 *   npm run generate-docs
 *   npx tsx scripts/generate-api-docs.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface Endpoint {
	method: string;
	path: string;
	description: string;
	auth: boolean;
}

interface Module {
	name: string;
	basePath: string;
	description: string;
	endpoints: Endpoint[];
}

const modules: Module[] = [
	{
		name: 'Authentication',
		basePath: '/api/auth',
		description: 'Autenticación con JWT (local) o Auth0 (OAuth social)',
		endpoints: [
			{ method: 'POST', path: '/register', description: 'Registrar nuevo usuario con email/password', auth: false },
			{ method: 'POST', path: '/login', description: 'Iniciar sesión con email/password', auth: false },
			{ method: 'POST', path: '/refresh', description: 'Renovar access token usando refresh token', auth: false },
			{ method: 'GET', path: '/me', description: 'Obtener información del usuario autenticado', auth: true },
			{ method: 'POST', path: '/change-password', description: 'Cambiar contraseña del usuario autenticado', auth: true },
		],
	},
	{
		name: 'Users',
		basePath: '/api/users',
		description: 'Gestión de usuarios del sistema',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar usuarios (con paginación cursor-based)', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener usuario por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear nuevo usuario', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar usuario completo', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial de usuario', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete (isActive=false)', auth: true },
		],
	},
	{
		name: 'Events',
		basePath: '/api/events',
		description: 'Gestión de eventos (conciertos, ferias, conferencias, etc.)',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar eventos', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener evento por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear nuevo evento', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar evento completo', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Reservations',
		basePath: '/api/reservations',
		description: 'Gestión de reservas/pedidos para eventos',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar reservas (filtrar por eventId)', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener reserva por ID', auth: true },
			{ method: 'GET', path: '/:id/invoice', description: 'Obtener factura/comprobante de reserva en PDF', auth: true },
			{ method: 'POST', path: '/', description: 'Crear nueva reserva (valida stock, aplica promociones)', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar reserva completa', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete (libera stock)', auth: true },
		],
	},
	{
		name: 'Products',
		basePath: '/api/products',
		description: 'Catálogo de productos por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar productos (filtrar por eventId)', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener producto por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear nuevo producto', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar producto completo', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Promotions',
		basePath: '/api/promotions',
		description: 'Promociones y descuentos (3x2, segunda unidad 50% OFF, etc.)',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar promociones (filtrar por eventId)', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener promoción por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear nueva promoción', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar promoción completa', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Expenses',
		basePath: '/api/expenses',
		description: 'Gastos del evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar gastos (filtrar por eventId)', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener gasto por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear nuevo gasto', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar gasto completo', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Salespeople',
		basePath: '/api/salespeople',
		description: 'Catálogo de vendedores por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar vendedores', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener vendedor por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear vendedor', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar vendedor', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Payment Methods',
		basePath: '/api/payment-methods',
		description: 'Catálogo de métodos de pago por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar métodos de pago', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener método por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear método de pago', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar método', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Cashiers',
		basePath: '/api/cashiers',
		description: 'Catálogo de cajeros por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar cajeros', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener cajero por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear cajero', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar cajero', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Stores',
		basePath: '/api/stores',
		description: 'Catálogo de tiendas/proveedores por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar tiendas', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener tienda por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear tienda', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar tienda', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Units',
		basePath: '/api/units',
		description: 'Catálogo de unidades de medida por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar unidades', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener unidad por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear unidad', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar unidad', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Consumption Types',
		basePath: '/api/consumption-types',
		description: 'Catálogo de tipos de consumo por evento (en local, para llevar, delivery)',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar tipos de consumo', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener tipo por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear tipo de consumo', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar tipo', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Payers',
		basePath: '/api/payers',
		description: 'Catálogo de pagadores de gastos por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar pagadores', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener pagador por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear pagador', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar pagador', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Pickup Points',
		basePath: '/api/pickup-points',
		description: 'Catálogo de puntos de recogida por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar puntos de recogida', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener punto por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear punto de recogida', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar punto', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
	{
		name: 'Partners',
		basePath: '/api/partners',
		description: 'Catálogo de colaboradores/partners por evento',
		endpoints: [
			{ method: 'GET', path: '/', description: 'Listar partners', auth: true },
			{ method: 'GET', path: '/:id', description: 'Obtener partner por ID', auth: true },
			{ method: 'POST', path: '/', description: 'Crear partner', auth: true },
			{ method: 'PUT', path: '/:id', description: 'Reemplazar partner', auth: true },
			{ method: 'PATCH', path: '/:id', description: 'Actualización parcial', auth: true },
			{ method: 'DELETE', path: '/:id', description: 'Soft delete', auth: true },
		],
	},
];

function generateMarkdown(): string {
	let md = `# EVENTOS API - Documentación Completa

**Versión**: 3.0.0
**Generado**: ${new Date().toISOString().split('T')[0]}

---

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Autenticación](#autenticación)
- [Paginación](#paginación)
- [Populate Strategy](#populate-strategy)
- [Códigos de Error](#códigos-de-error)
- [Endpoints](#endpoints)
${modules.map((m) => `  - [${m.name}](#${m.name.toLowerCase().replace(/ /g, '-')})`).join('\n')}

---

## 📖 Introducción

EVENTOS API es un sistema backend para gestión de eventos (conciertos, ferias, conferencias, etc.) construido con:

- **TypeScript + Fastify + MongoDB**
- **Multi-tenant por evento**: Todos los datos particionados por \`eventId\`
- **Paginación cursor-based**: No offset/limit
- **Soft delete**: Entidades se marcan como \`isActive: false\`
- **Populate automático**: Referencias se devuelven como objetos completos

### Base URL

\`\`\`
http://localhost:3000/api
\`\`\`

Para producción, usar:
\`\`\`
https://api.eventos.example.com/api
\`\`\`

---

## 🔐 Autenticación

El API soporta **dos estrategias** de autenticación (mutuamente excluyentes):

### 1. JWT Local (Email/Password)

**Configuración:**
\`\`\`bash
AUTH_ENABLED=true
AUTH0_ENABLED=false
JWT_SECRET=your-secret-key-min-32-chars
\`\`\`

**Header:**
\`\`\`http
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

**Flujo:**
1. \`POST /api/auth/register\` o \`POST /api/auth/login\` → obtener \`accessToken\` y \`refreshToken\`
2. Usar \`accessToken\` en header \`Authorization\`
3. Cuando expire (24h), usar \`POST /api/auth/refresh\` con \`refreshToken\`

### 2. Auth0 OAuth (Social Login)

**Configuración:**
\`\`\`bash
AUTH_ENABLED=false
AUTH0_ENABLED=true
AUTH0_DOMAIN=tu-tenant.auth0.com
AUTH0_AUDIENCE=https://api.tu-app.com
\`\`\`

**Header:**
\`\`\`http
Authorization: Bearer YOUR_AUTH0_TOKEN
\`\`\`

### Rutas Públicas (sin autenticación)

- \`GET /health\`
- \`GET /swagger\`
- \`POST /api/auth/register\`
- \`POST /api/auth/login\`

---

## 📄 Paginación

Todos los endpoints de listado (GET) usan **paginación cursor-based**:

### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| \`limit\` | number | 50 | Items por página (max: 100) |
| \`after\` | string | - | Cursor para siguiente página |
| \`sortBy\` | string | createdAt | Campo de ordenamiento |
| \`sortDir\` | string | desc | Dirección: asc \\| desc |
| \`eventId\` | string | - | Filtrar por evento (requerido en la mayoría) |
| \`isActive\` | boolean | true | Filtrar por estado activo |

### Ejemplo de Respuesta

\`\`\`json
{
  "ok": true,
  "data": [
    { "id": "...", "name": "...", ... },
    { "id": "...", "name": "...", ... }
  ],
  "page": {
    "limit": 50,
    "nextCursor": "507f1f77bcf86cd799439011",
    "total": 150
  }
}
\`\`\`

### Siguiente Página

\`\`\`http
GET /api/products?eventId=abc123&limit=50&after=507f1f77bcf86cd799439011
\`\`\`

---

## 🔗 Populate Strategy

Las respuestas del API devuelven **objetos completos** en lugar de solo IDs.

### Antes (solo IDs)

\`\`\`json
{
  "id": "abc123",
  "payerId": "def456",
  "storeId": "ghi789"
}
\`\`\`

### Ahora (populate automático)

\`\`\`json
{
  "id": "abc123",
  "payer": {
    "id": "def456",
    "name": "Organización Principal",
    "phone": "+34600123456",
    "isActive": true
  },
  "store": {
    "id": "ghi789",
    "name": "Mercado Central",
    "seller": "Juan García",
    "isActive": true
  }
}
\`\`\`

### Módulos con Populate

- **Expenses**: \`payer\`, \`store?\`, \`unit?\`
- **Reservations**: \`salesperson?\`, \`consumptionType\`, \`pickupPoint?\`, \`paymentMethod\`, \`cashier?\`
- **Products**: \`promotions[]\`
- **Promotions**: \`applicables[]\` (productos)

**Ventaja**: Frontend obtiene toda la información en 1 request (no múltiples roundtrips)

Ver más detalles en: [docs/populate-strategy.md](./populate-strategy.md)

---

## ⚠️ Códigos de Error

| Código | Descripción | Ejemplo |
|--------|-------------|---------|
| 400 | Bad Request | Validación fallida, parámetros inválidos |
| 401 | Unauthorized | Falta token de autenticación |
| 403 | Forbidden | Sin permisos para realizar la operación |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Violación de unicidad (nombre duplicado) |
| 500 | Internal Server Error | Error inesperado del servidor |

### Formato de Respuesta de Error

\`\`\`json
{
  "ok": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "error": "Bad Request",
  "message": "Error de validación en los datos enviados",
  "details": [
    {
      "path": "name",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
\`\`\`

---

## 🚀 Endpoints

`;

	for (const module of modules) {
		md += `\n### ${module.name}\n\n`;
		md += `${module.description}\n\n`;
		md += `**Base Path:** \`${module.basePath}\`\n\n`;
		md += `| Método | Endpoint | Descripción | Auth |\n`;
		md += `|--------|----------|-------------|------|\n`;

		for (const endpoint of module.endpoints) {
			const fullPath = endpoint.path === '/' ? module.basePath : module.basePath + endpoint.path;
			md += `| \`${endpoint.method}\` | \`${fullPath}\` | ${endpoint.description} | ${endpoint.auth ? '✅' : '❌'} |\n`;
		}

		md += '\n';
	}

	md += `\n---\n\n`;
	md += `## 📚 Documentación Adicional\n\n`;
	md += `- **Swagger UI**: [\`http://localhost:3000/swagger\`](http://localhost:3000/swagger)\n`;
	md += `- **Arquitectura**: [docs/architecture.md](./architecture.md)\n`;
	md += `- **Modelo de Datos**: [docs/data-model.md](./data-model.md)\n`;
	md += `- **Populate Strategy**: [docs/populate-strategy.md](./populate-strategy.md)\n`;
	md += `- **Códigos de Error**: [docs/error-codes.md](./error-codes.md)\n`;
	md += `- **Variables de Entorno**: [docs/env.md](./env.md)\n\n`;
	md += `---\n\n`;
	md += `**Generado automáticamente** | [GitHub](https://github.com/tu-org/eventos-backend)\n`;

	return md;
}

async function main() {
	try {
		console.log('📝 Generando documentación API...');
		const markdown = generateMarkdown();

		const outputPath = './docs/API-REFERENCE.md';
		writeFileSync(outputPath, markdown, 'utf-8');

		console.log(`✅ Documentación generada: ${outputPath}`);
		console.log(`📊 Total de módulos documentados: ${modules.length}`);
		console.log(`📄 Líneas generadas: ${markdown.split('\n').length}`);

		process.exit(0);
	} catch (error) {
		console.error('❌ Error generando documentación:', error);
		process.exit(1);
	}
}

main();
