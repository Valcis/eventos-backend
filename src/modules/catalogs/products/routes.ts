import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../../controller';
import {
	Product,
	ProductCreate,
	ProductReplace,
	ProductPatch,
	type ProductT,
} from './schema';
import { isoifyFields } from '../../../shared/lib/dates';
import {
	createPagedResponse,
	createCreatedResponse,
	NotFoundResponse,
	ValidationErrorResponse,
	UnauthorizedResponse,
	InternalErrorResponse,
	NoContentResponse,
} from '../../../shared/schemas/responses';

// Schemas de query con paginación, sort y filtros
const ProductsQueryParams = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional().describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación (ID del último elemento)'),
	sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'stock']).optional().describe('Campo por el cual ordenar. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	name: z.string().optional().describe('Filtrar por nombre (búsqueda parcial, case-insensitive)'),
});

// Schemas de respuesta
const ProductPageResponse = createPagedResponse(Product, 'productos');
const ProductCreatedResponse = createCreatedResponse(Product, 'Producto');

const IdParam = z.object({
	id: z.string().min(1).describe('ID del producto'),
});

export default async function productsRoutes(app: FastifyInstance) {
	const ctrl = makeController<ProductT>(
		'products',
		(data) => Product.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Product.parse(normalized);
		},
	);

	// GET /products - Listar productos paginados y ordenables
	app.get(
		'/',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Listar productos',
				description:
					'Obtiene un listado paginado y ordenable de productos. Permite filtrar por evento y nombre. Por defecto se ordenan por createdAt descendente (más recientes primero).',
				querystring: ProductsQueryParams,
				response: {
					200: ProductPageResponse.describe('Lista paginada de productos'),
					400: ValidationErrorResponse.describe('Error de validación en parámetros'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.list,
	);

	// GET /products/:id - Obtener producto por ID
	app.get(
		'/:id',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Obtener producto por ID',
				description: 'Recupera la información completa de un producto específico',
				params: IdParam,
				response: {
					200: Product.describe('Producto encontrado'),
					404: NotFoundResponse.describe('Producto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.get,
	);

	// POST /products - Crear nuevo producto
	app.post(
		'/',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Crear nuevo producto',
				description:
					'Crea un nuevo producto en el sistema. El stock inicial debe ser >= 0. Los campos id, createdAt y updatedAt son generados automáticamente.',
				body: ProductCreate,
				response: {
					201: ProductCreatedResponse.describe('Producto creado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.create,
	);

	// PUT /products/:id - Reemplazar producto completo
	app.put(
		'/:id',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Reemplazar producto completo',
				description:
					'Reemplaza todos los campos del producto (excepto id, eventId y timestamps). Los campos no enviados se establecerán a sus valores por defecto.',
				params: IdParam,
				body: ProductReplace,
				response: {
					200: Product.describe('Producto actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Producto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.replace,
	);

	// PATCH /products/:id - Actualización parcial
	app.patch(
		'/:id',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Actualización parcial de producto',
				description:
					'Actualiza solo los campos especificados del producto. Los campos no enviados mantienen su valor actual.',
				params: IdParam,
				body: ProductPatch,
				response: {
					200: Product.describe('Producto actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Producto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.patch,
	);

	// DELETE /products/:id - Borrado lógico
	app.delete(
		'/:id',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Borrado lógico de producto',
				description:
					'Marca el producto como inactivo (isActive = false). El producto no se elimina físicamente de la base de datos.',
				params: IdParam,
				response: {
					204: NoContentResponse.describe('Producto eliminado exitosamente'),
					404: NotFoundResponse.describe('Producto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
