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

// Schemas de paginación
const PaginationQuery = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional(),
	after: z.string().optional(),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	name: z.string().optional().describe('Filtrar por nombre (búsqueda parcial)'),
});

// Comentado - no se usa sin response schemas
// const PageMeta = z.object({
// 	limit: z.number().int().positive(),
// 	nextCursor: z.string().optional(),
// 	total: z.number().int().nonnegative(),
// });

// const ProductPage = z.object({
// 	items: z.array(Product),
// 	page: PageMeta,
// });

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

	// GET /products - Listar productos paginados
	app.get(
		'/',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Listar productos',
				description:
					'Obtiene un listado paginado de productos. Permite filtrar por evento y nombre.',
				querystring: PaginationQuery,
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
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
