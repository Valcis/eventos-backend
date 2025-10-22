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
		(data) => PaymentMethod.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
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
		ctrl.list,
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
