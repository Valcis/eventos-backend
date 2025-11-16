import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../controller';
import { Expense, ExpenseCreate, ExpenseReplace, ExpensePatch, type ExpenseT } from './schema';
import { isoifyFields } from '../../shared/lib/dates';
import { Id } from '../catalogs/zod.schemas';
import {
	createPagedResponse,
	createCreatedResponse,
	NotFoundResponse,
	ValidationErrorResponse,
	UnauthorizedResponse,
	InternalErrorResponse,
	NoContentResponse,
} from '../../shared/schemas/responses';

const TAG = 'Gastos';

const ExpensesQueryParams = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(5)
		.max(50)
		.optional()
		.describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'netPrice'])
		.optional()
		.describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	ingredient: z
		.string()
		.optional()
		.describe('Filtrar por nombre del ingrediente (búsqueda parcial)'),
	isVerified: z.coerce.boolean().optional().describe('Filtrar por estado de verificación'),
});

const ExpensePageResponse = createPagedResponse(Expense, 'gastos');
const ExpenseCreatedResponse = createCreatedResponse(Expense, 'Gasto');

const IdParam = z.object({
	id: Id,
});

export default async function expensesRoutes(app: FastifyInstance) {
	const ctrl = makeController<ExpenseT>(
		'expenses',
		(data) => {
			// No validamos aquí - Fastify ya validó con ExpenseCreate/ExpenseReplace/ExpensePatch
			// Solo transformamos las fechas si existen
			const transformed: Record<string, unknown> = { ...data };
			if ('date' in data && typeof data.date === 'string') {
				transformed.date = new Date(data.date);
			}
			return transformed;
		},
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
				isActive: rest.isActive !== undefined ? rest.isActive : true,
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Expense.parse(normalized);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar gastos',
				description:
					'Obtiene un listado paginado y ordenable de gastos. Los gastos representan compras de ingredientes, materiales o servicios para un evento. Por defecto se ordenan por createdAt descendente.',
				querystring: ExpensesQueryParams,
				response: {
					200: ExpensePageResponse.describe('Lista paginada de gastos'),
					400: ValidationErrorResponse.describe('Error de validación en parámetros'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			// Handler personalizado para procesar filtros de gastos
			type QInput = z.infer<typeof ExpensesQueryParams>;
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const query = req.query as QInput;
			const { ObjectId } = await import('mongodb');
			const { makeCrud } = await import('../../infra/mongo/crud');

			// Separar paginación, ordenación y filtros
			const {
				limit: rawLimit,
				after,
				sortBy = 'createdAt',
				sortDir = 'desc',
				eventId,
				ingredient,
				isVerified,
			} = query;
			const limit = rawLimit || 15;

			// Construir filtros de MongoDB
			const mongoFilters: Record<string, unknown> = { isActive: true };

			// Filtro por eventId: convertir a ObjectId
			if (eventId) {
				if (!ObjectId.isValid(eventId)) {
					const { BadRequestError } = await import('../../core/http/errors');
					throw new BadRequestError(`eventId inválido: "${eventId}" no es un ObjectId válido`);
				}
				mongoFilters.eventId = new ObjectId(eventId);
			}

			// Filtro por ingrediente: búsqueda parcial case-insensitive
			if (ingredient) {
				mongoFilters.ingredient = { $regex: ingredient, $options: 'i' };
			}

			// Filtro por isVerified
			if (isVerified !== undefined) {
				mongoFilters.isVerified = isVerified;
			}

			// Usar makeCrud directamente para aprovechar la paginación genérica
			const crud = makeCrud<ExpenseT>({
				collection: 'expenses',
				toDb: (data) => data,
				fromDb: (doc) => {
					const { _id, ...rest } = doc;
					const base = {
						...(rest as Record<string, unknown>),
						id: String(_id),
						isActive: rest.isActive !== undefined ? rest.isActive : true,
					};
					const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
					return Expense.parse(normalized);
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

	app.get(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Obtener gasto por ID',
				description:
					'Devuelve los detalles completos de un gasto específico incluyendo información de precios, IVA, cantidades y verificación.',
				params: IdParam,
				response: {
					200: Expense.describe('Gasto encontrado'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.get,
	);

	app.post(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Crear nuevo gasto',
				description:
					'Registra un nuevo gasto para un evento. Calcula automáticamente IVA (vatAmount y netPrice) desde basePrice, o basePrice desde netPrice. Incluye gestión de paquetes.',
				body: ExpenseCreate,
				response: {
					201: ExpenseCreatedResponse.describe('Gasto creado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const body = req.body as z.infer<typeof ExpenseCreate>;

			// Calcular IVA automáticamente
			const { processVAT } = await import('./vat-calculator');

			const vatResult = processVAT({
				basePrice: body.basePrice,
				vatPct: body.vatPct,
				vatAmount: body.vatAmount,
				netPrice: body.netPrice,
			});

			// Actualizar body con valores calculados
			req.body = {
				...body,
				basePrice: vatResult.basePrice,
				vatAmount: vatResult.vatAmount,
				netPrice: vatResult.netPrice,
			};

			// Usar el controlador genérico para la creación
			return ctrl.create(req, reply);
		},
	);

	app.put(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Reemplazar gasto completo',
				description:
					'Reemplaza todos los campos de un gasto existente (excepto eventId). Recalcula IVA automáticamente. Requiere proporcionar todos los campos obligatorios.',
				params: IdParam,
				body: ExpenseReplace,
				response: {
					200: Expense.describe('Gasto actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const body = req.body as z.infer<typeof ExpenseReplace>;

			// Calcular IVA automáticamente
			const { processVAT } = await import('./vat-calculator');

			const vatResult = processVAT({
				basePrice: body.basePrice,
				vatPct: body.vatPct,
				vatAmount: body.vatAmount,
				netPrice: body.netPrice,
			});

			// Actualizar body con valores calculados
			req.body = {
				...body,
				basePrice: vatResult.basePrice,
				vatAmount: vatResult.vatAmount,
				netPrice: vatResult.netPrice,
			};

			// Usar el controlador genérico para la actualización
			return ctrl.replace(req, reply);
		},
	);

	app.patch(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Actualizar gasto parcialmente',
				description:
					'Actualiza uno o más campos de un gasto existente. Si se modifica basePrice, vatPct o netPrice, recalcula IVA automáticamente. Solo los campos proporcionados serán modificados.',
				params: IdParam,
				body: ExpensePatch,
				response: {
					200: Expense.describe('Gasto actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			const db = (req.server as unknown as { db: import('mongodb').Db }).db;
			const { id } = req.params as { id: string };
			const body = req.body as z.infer<typeof ExpensePatch>;

			// Si se modifican campos de IVA, recalcular
			const { ObjectId } = await import('mongodb');
			const { NotFoundError } = await import('../../core/http/errors');

			const vatFieldsModified =
				body.basePrice !== undefined || body.vatPct !== undefined || body.netPrice !== undefined;

			if (vatFieldsModified) {
				// Obtener gasto existente para los valores actuales
				const existing = await db.collection('expenses').findOne({
					_id: new ObjectId(id),
				});

				if (!existing) {
					throw new NotFoundError('expenses', id);
				}

				// Calcular IVA con valores actualizados
				const { processVAT } = await import('./vat-calculator');

				const vatResult = processVAT({
					basePrice: body.basePrice ?? (existing.basePrice as string),
					vatPct: body.vatPct ?? (existing.vatPct as number),
					vatAmount: body.vatAmount ?? (existing.vatAmount as string),
					netPrice: body.netPrice ?? (existing.netPrice as string),
				});

				// Actualizar body con valores calculados
				req.body = {
					...body,
					basePrice: vatResult.basePrice,
					vatAmount: vatResult.vatAmount,
					netPrice: vatResult.netPrice,
				};
			}

			// Usar el controlador genérico para la actualización
			return ctrl.patch(req, reply);
		},
	);

	app.delete(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Eliminar gasto',
				description:
					'Realiza un borrado lógico del gasto (establece isActive=false). El gasto no se elimina físicamente de la base de datos.',
				params: IdParam,
				response: {
					204: NoContentResponse.describe('Gasto eliminado exitosamente'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
