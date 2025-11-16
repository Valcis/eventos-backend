import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../../controller';
import { Product, ProductCreate, ProductReplace, ProductPatch, type ProductT } from './schema';
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
	limit: z.coerce
		.number()
		.int()
		.min(5)
		.max(50)
		.optional()
		.describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación (ID del último elemento)'),
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'name', 'stock'])
		.optional()
		.describe('Campo por el cual ordenar. Default: createdAt'),
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
	const { ObjectId } = await import('mongodb');

	const ctrl = makeController<ProductT>(
		'products',
		(data) => {
			const transformed: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };

			// Convert promotions embedded objects to array of promotion IDs
			if ('promotions' in data && Array.isArray(data.promotions)) {
				const promotions = data.promotions as Array<{ id: string } | string>;
				transformed.promotions = promotions.map((p) =>
					typeof p === 'object' && 'id' in p ? new ObjectId(p.id) : new ObjectId(p as string)
				);
			}

			return transformed;
		},
		async (doc, db) => {
			const { _id, eventId, promotions, ...rest } = doc;

			// Lookup promotions (optional array)
			let populatedPromotions: Array<{
				id: string;
				name: string;
				description?: string;
				rule: string;
				priority: number;
				isCumulative: boolean;
				startDate: string;
				endDate: string;
				isActive: boolean;
			}> = [];

			if (promotions && Array.isArray(promotions) && promotions.length > 0) {
				const promotionDocs = await db
					.collection('promotions')
					.find({ _id: { $in: promotions } })
					.toArray();

				populatedPromotions = promotionDocs.map((p) => ({
					id: String(p._id),
					name: p.name as string,
					description: p.description as string | undefined,
					rule: p.rule as string,
					priority: p.priority as number,
					isCumulative: p.isCumulative as boolean,
					startDate: (p.startDate as Date).toISOString(),
					endDate: (p.endDate as Date).toISOString(),
					isActive: (p.isActive ?? true) as boolean,
				}));
			}

			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
				eventId: String(eventId),
				promotions: populatedPromotions,
				isActive: rest.isActive !== undefined ? rest.isActive : true,
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
		async (req, reply) => {
			// Handler personalizado para procesar filtros de productos
			type QInput = z.infer<typeof ProductsQueryParams>;
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const query = req.query as QInput;
			const { ObjectId } = await import('mongodb');
			const { makeCrud } = await import('../../../infra/mongo/crud');

			// Separar paginación, ordenación y filtros
			const { limit: rawLimit, after, sortBy = 'createdAt', sortDir = 'desc', eventId, name } = query;
			const limit = rawLimit || 15;

			// Construir filtros de MongoDB
			const mongoFilters: Record<string, unknown> = { isActive: true };

			// Filtro por eventId: convertir a ObjectId
			if (eventId) {
				if (!ObjectId.isValid(eventId)) {
					const { BadRequestError } = await import('../../../core/http/errors');
					throw new BadRequestError(`eventId inválido: "${eventId}" no es un ObjectId válido`);
				}
				mongoFilters.eventId = new ObjectId(eventId);
			}

			// Filtro por nombre: búsqueda parcial case-insensitive
			if (name) {
				mongoFilters.name = { $regex: name, $options: 'i' };
			}

			// Usar makeCrud directamente para aprovechar la paginación genérica
			const crud = makeCrud<ProductT>({
				collection: 'products',
				toDb: (data) => data,
				fromDb: async (doc, db) => {
					const { _id, eventId, promotions, ...rest } = doc;

					// Lookup promotions (optional array)
					let populatedPromotions: Array<{
						id: string;
						name: string;
						description?: string;
						rule: string;
						priority: number;
						isCumulative: boolean;
						startDate: string;
						endDate: string;
						isActive: boolean;
					}> = [];

					if (promotions && Array.isArray(promotions) && promotions.length > 0) {
						const promotionDocs = await db
							.collection('promotions')
							.find({ _id: { $in: promotions } })
							.toArray();

						populatedPromotions = promotionDocs.map((p) => ({
							id: String(p._id),
							name: p.name as string,
							description: p.description as string | undefined,
							rule: p.rule as string,
							priority: p.priority as number,
							isCumulative: p.isCumulative as boolean,
							startDate: (p.startDate as Date).toISOString(),
							endDate: (p.endDate as Date).toISOString(),
							isActive: (p.isActive ?? true) as boolean,
						}));
					}

					const base = {
						...(rest as Record<string, unknown>),
						id: String(_id),
						eventId: String(eventId),
						promotions: populatedPromotions,
						isActive: rest.isActive !== undefined ? rest.isActive : true,
					};
					const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
					return Product.parse(normalized);
				},
				softDelete: true,
				defaultSortBy: 'createdAt',
				defaultSortDir: 'desc',
			});

			const result = await crud.list(
				db,
				mongoFilters as import('mongodb').Filter<import('mongodb').Document>,
				{
					limit,
					after: after || null,
					sortBy,
					sortDir,
				},
			);

			return reply.send(result);
		},
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
					'Crea un nuevo producto en el sistema. Valida que todas las promociones referenciadas existan y pertenezcan al mismo evento. El stock inicial debe ser >= 0.',
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
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const body = req.body as z.infer<typeof ProductCreate>;

			// Validar promociones si existen
			if (body.promotions && body.promotions.length > 0) {
				const { ObjectId } = await import('mongodb');
				const { AppError } = await import('../../../core/http/errors');

				// Extract IDs from embedded promotion objects
				const promotionIds = body.promotions.map((p) => new ObjectId(p.id));

				// Buscar todas las promociones
				const promotions = await db
					.collection('promotions')
					.find({
						_id: { $in: promotionIds },
						eventId: new ObjectId(body.eventId),
						isActive: true,
					})
					.toArray();

				// Verificar que todas existen
				if (promotions.length !== body.promotions.length) {
					const foundIds = promotions.map((p) => p._id.toString());
					const inputIds = body.promotions.map((p) => p.id);
					const missing = inputIds.filter((id) => !foundIds.includes(id));

					throw new AppError(
						'VALIDATION_ERROR',
						`Las siguientes promociones no existen o no pertenecen al evento: ${missing.join(', ')}`,
						400,
					);
				}
			}

			// Usar el controlador genérico para la creación
			return ctrl.create(req, reply);
		},
	);

	// PUT /products/:id - Reemplazar producto completo
	app.put(
		'/:id',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Reemplazar producto completo',
				description:
					'Reemplaza todos los campos del producto (excepto id, eventId y timestamps). Valida que todas las promociones referenciadas existan y pertenezcan al mismo evento.',
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
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const { id } = req.params as { id: string };
			const body = req.body as z.infer<typeof ProductReplace>;

			const { ObjectId } = await import('mongodb');
			const { NotFoundError, AppError } = await import('../../../core/http/errors');

			// Obtener producto existente para obtener el eventId
			const existing = await db.collection('products').findOne({
				_id: new ObjectId(id),
			});

			if (!existing) {
				throw new NotFoundError('products', id);
			}

			const eventId = (existing.eventId as typeof ObjectId).toString();

			// Validar promociones si existen
			if (body.promotions && body.promotions.length > 0) {
				// Extract IDs from embedded promotion objects
				const promotionIds = body.promotions.map((p) => new ObjectId(p.id));

				// Buscar todas las promociones
				const promotions = await db
					.collection('promotions')
					.find({
						_id: { $in: promotionIds },
						eventId: new ObjectId(eventId),
						isActive: true,
					})
					.toArray();

				// Verificar que todas existen
				if (promotions.length !== body.promotions.length) {
					const foundIds = promotions.map((p) => p._id.toString());
					const inputIds = body.promotions.map((p) => p.id);
					const missing = inputIds.filter((id) => !foundIds.includes(id));

					throw new AppError(
						'VALIDATION_ERROR',
						`Las siguientes promociones no existen o no pertenecen al evento: ${missing.join(', ')}`,
						400,
					);
				}
			}

			// Usar el controlador genérico para la actualización
			return ctrl.replace(req, reply);
		},
	);

	// PATCH /products/:id - Actualización parcial
	app.patch(
		'/:id',
		{
			schema: {
				tags: ['Productos'],
				summary: 'Actualización parcial de producto',
				description:
					'Actualiza solo los campos especificados del producto. Si se modifican las promociones, valida que todas existan y pertenezcan al mismo evento.',
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
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const { id } = req.params as { id: string };
			const body = req.body as z.infer<typeof ProductPatch>;

			const { ObjectId } = await import('mongodb');
			const { NotFoundError, AppError } = await import('../../../core/http/errors');

			// Obtener producto existente para obtener el eventId
			const existing = await db.collection('products').findOne({
				_id: new ObjectId(id),
			});

			if (!existing) {
				throw new NotFoundError('products', id);
			}

			const eventId = (existing.eventId as typeof ObjectId).toString();

			// Validar promociones solo si se están modificando
			if (body.promotions && body.promotions.length > 0) {
				// Extract IDs from embedded promotion objects
				const promotionIds = body.promotions.map((p) => new ObjectId(p.id));

				// Buscar todas las promociones
				const promotions = await db
					.collection('promotions')
					.find({
						_id: { $in: promotionIds },
						eventId: new ObjectId(eventId),
						isActive: true,
					})
					.toArray();

				// Verificar que todas existen
				if (promotions.length !== body.promotions.length) {
					const foundIds = promotions.map((p) => p._id.toString());
					const inputIds = body.promotions.map((p) => p.id);
					const missing = inputIds.filter((id) => !foundIds.includes(id));

					throw new AppError(
						'VALIDATION_ERROR',
						`Las siguientes promociones no existen o no pertenecen al evento: ${missing.join(', ')}`,
						400,
					);
				}
			}

			// Usar el controlador genérico para la actualización
			return ctrl.patch(req, reply);
		},
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
