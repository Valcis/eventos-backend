import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../../controller';
import { ConsumptionType, type ConsumptionTypeT } from '../schema';
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

const TAG = 'Tipos de Consumo';

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

const PageResponse = createPagedResponse(ConsumptionType, 'tipos de consumo');
const CreatedResponse = createCreatedResponse(ConsumptionType, 'tipo de consumo');
const IdParam = z.object({ id: z.string().min(1).describe('ID del tipo de consumo') });

export default async function routes(app: FastifyInstance) {
	const ctrl = makeController<ConsumptionTypeT>(
		'tipos de consumo',
		(data) => {
			// No validamos aquí - Fastify ya validó con Schema
			// Solo transformamos las fechas si existen y son strings
			const transformed: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };
			return transformed as ConsumptionTypeT;
		},
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
				isActive: rest.isActive !== undefined ? rest.isActive : true,
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
			return ConsumptionType.parse(normalized);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar tipos de consumo',
				description: 'Obtiene un listado paginado y ordenable de tipos de consumo',
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
			// Handler personalizado para procesar filtros de tipos de consumo
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
			const crud = makeCrud<ConsumptionTypeT>({
				collection: 'tipos de consumo',
				toDb: (data) => data,
				fromDb: (doc) => {
					const { _id, ...rest } = doc;
					const base = {
						...(rest as Record<string, unknown>),
						id: String(_id),
						isActive: rest.isActive !== undefined ? rest.isActive : true,
					};
					const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
					return ConsumptionType.parse(normalized);
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
				summary: 'Obtener tipo de consumo por ID',
				params: IdParam,
				response: {
					200: ConsumptionType,
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
				summary: 'Crear tipo de consumo',
				body: ConsumptionType,
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
				summary: 'Reemplazar tipo de consumo',
				params: IdParam,
				body: ConsumptionType,
				response: {
					200: ConsumptionType,
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
				summary: 'Actualizar tipo de consumo parcialmente',
				params: IdParam,
				body: ConsumptionType.partial(),
				response: {
					200: ConsumptionType,
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
				summary: 'Eliminar tipo de consumo',
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
