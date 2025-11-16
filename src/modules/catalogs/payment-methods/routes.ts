import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../../controller';
import { PaymentMethod, type PaymentMethodT } from '../schema';
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

const TAG = 'Métodos de Pago';

const QueryParams = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(5)
		.max(50)
		.optional()
		.describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'name'])
		.optional()
		.describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	name: z.string().optional().describe('Filtrar por nombre (búsqueda parcial)'),
});

const PageResponse = createPagedResponse(PaymentMethod, 'métodos de pago');
const CreatedResponse = createCreatedResponse(PaymentMethod, 'método de pago');
const IdParam = z.object({ id: z.string().min(1).describe('ID del método de pago') });

export default async function routes(app: FastifyInstance) {
	const ctrl = makeController<PaymentMethodT>(
		'métodos de pago',
		(data) => {
			// No validamos aquí - Fastify ya validó con Schema
			// Solo transformamos las fechas si existen y son strings
			const transformed: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };
			return transformed as PaymentMethodT;
		},
		(doc) => {
			const { _id, eventId, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
				eventId: String(eventId),
				isActive: rest.isActive !== undefined ? rest.isActive : true,
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
			return PaymentMethod.parse(normalized);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar métodos de pago',
				description: 'Obtiene un listado paginado y ordenable de métodos de pago',
				querystring: QueryParams,
				response: {
					200: PageResponse,
					400: ValidationErrorResponse,
					401: UnauthorizedResponse,
					500: InternalErrorResponse,
				},
				security: [{ bearerAuth: [] }],
			},
		},
		async (req, reply) => {
			// Handler personalizado para procesar filtros de métodos de pago
			type QInput = z.infer<typeof QueryParams>;
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
			const crud = makeCrud<PaymentMethodT>({
				collection: 'métodos de pago',
				toDb: (data) => data,
				fromDb: (doc) => {
					const { _id, eventId, ...rest } = doc;
					const base = {
						...(rest as Record<string, unknown>),
						id: String(_id),
						eventId: String(eventId),
						isActive: rest.isActive !== undefined ? rest.isActive : true,
					};
					const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
					return PaymentMethod.parse(normalized);
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
				summary: 'Obtener método de pago por ID',
				params: IdParam,
				response: {
					200: PaymentMethod,
					404: NotFoundResponse,
					401: UnauthorizedResponse,
					500: InternalErrorResponse,
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
				summary: 'Crear método de pago',
				body: PaymentMethod,
				response: {
					201: CreatedResponse,
					400: ValidationErrorResponse,
					401: UnauthorizedResponse,
					500: InternalErrorResponse,
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.create,
	);

	app.put(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Reemplazar método de pago',
				params: IdParam,
				body: PaymentMethod,
				response: {
					200: PaymentMethod,
					400: ValidationErrorResponse,
					404: NotFoundResponse,
					401: UnauthorizedResponse,
					500: InternalErrorResponse,
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.replace,
	);

	app.patch(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Actualizar método de pago parcialmente',
				params: IdParam,
				body: PaymentMethod.partial(),
				response: {
					200: PaymentMethod,
					400: ValidationErrorResponse,
					404: NotFoundResponse,
					401: UnauthorizedResponse,
					500: InternalErrorResponse,
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.patch,
	);

	app.delete(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Eliminar método de pago',
				params: IdParam,
				response: {
					204: NoContentResponse,
					404: NotFoundResponse,
					401: UnauthorizedResponse,
					500: InternalErrorResponse,
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
