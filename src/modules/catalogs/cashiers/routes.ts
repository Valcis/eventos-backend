import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../../controller';
import { Cashier, type CashierT } from '../schema';
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

const TAG = 'Cajeros';

const CashiersQueryParams = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional().describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional().describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	name: z.string().optional().describe('Filtrar por nombre (búsqueda parcial)'),
});

const CashierPageResponse = createPagedResponse(Cashier, 'cajeros');
const CashierCreatedResponse = createCreatedResponse(Cashier, 'Cajero');
const IdParam = z.object({ id: z.string().min(1).describe('ID del cajero') });

export default async function cashiersRoutes(app: FastifyInstance) {
	const ctrl = makeController<CashierT>(
		'cashiers',
		(data) => Cashier.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Cashier.parse(normalized);
		},
	);

	app.get('/', {
		schema: {
			tags: [TAG],
			summary: 'Listar cajeros',
			description: 'Obtiene un listado paginado y ordenable de cajeros',
			querystring: CashiersQueryParams,
			response: {
				200: CashierPageResponse,
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
			summary: 'Obtener cajero por ID',
			params: IdParam,
			response: {
				200: Cashier,
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
			summary: 'Crear cajero',
			body: Cashier,
			response: {
				201: CashierCreatedResponse,
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
			summary: 'Reemplazar cajero',
			params: IdParam,
			body: Cashier,
			response: {
				200: Cashier,
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
			summary: 'Actualizar cajero parcialmente',
			params: IdParam,
			body: Cashier.partial(),
			response: {
				200: Cashier,
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
			summary: 'Eliminar cajero',
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
