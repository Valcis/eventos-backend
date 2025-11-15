import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../../controller';
import { Partner, type PartnerT } from '../schema';
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

const TAG = 'Socios';

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

const PageResponse = createPagedResponse(Partner, 'socios');
const CreatedResponse = createCreatedResponse(Partner, 'socio');
const IdParam = z.object({ id: z.string().min(1).describe('ID del socio') });

export default async function routes(app: FastifyInstance) {
	const ctrl = makeController<PartnerT>(
		'socios',
		(data) => {
			// No validamos aquí - Fastify ya validó con Schema
			// Solo transformamos las fechas si existen y son strings
			const transformed: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };
			return transformed as PartnerT;
		},
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
			return Partner.parse(normalized);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar socios',
				description: 'Obtiene un listado paginado y ordenable de socios',
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
		ctrl.list,
	);

	app.get(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Obtener socio por ID',
				params: IdParam,
				response: {
					200: Partner,
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
				summary: 'Crear socio',
				body: Partner,
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
				summary: 'Reemplazar socio',
				params: IdParam,
				body: Partner,
				response: {
					200: Partner,
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
				summary: 'Actualizar socio parcialmente',
				params: IdParam,
				body: Partner.partial(),
				response: {
					200: Partner,
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
				summary: 'Eliminar socio',
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
