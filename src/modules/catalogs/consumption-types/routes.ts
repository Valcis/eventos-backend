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
	limit: z.coerce.number().int().min(5).max(50).optional().describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional().describe('Campo de ordenación. Default: createdAt'),
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
		(data) => ConsumptionType.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
			return ConsumptionType.parse(normalized);
		},
	);

	app.get('/', {
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
	}, ctrl.list);

	app.get('/:id', {
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
	}, ctrl.get);

	app.post('/', {
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
	}, ctrl.create);

	app.put('/:id', {
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
	}, ctrl.replace);

	app.patch('/:id', {
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
	}, ctrl.patch);

	app.delete('/:id', {
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
	}, ctrl.remove);
}
