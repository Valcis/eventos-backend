import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../controller';
import {
	Reservation,
	ReservationCreate,
	ReservationReplace,
	ReservationPatch,
	type ReservationT,
} from './schema';
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

const TAG = 'Reservas';

const ReservationsQueryParams = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional().describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z.enum(['createdAt', 'updatedAt', 'totalAmount']).optional().describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	reserver: z.string().optional().describe('Filtrar por nombre del cliente (búsqueda parcial)'),
	isPaid: z.coerce.boolean().optional().describe('Filtrar por estado de pago'),
	isDelivered: z.coerce.boolean().optional().describe('Filtrar por estado de entrega'),
});

const ReservationPageResponse = createPagedResponse(Reservation, 'reservas');
const ReservationCreatedResponse = createCreatedResponse(Reservation, 'Reserva');

const IdParam = z.object({
	id: Id,
});

export default async function reservationsRoutes(app: FastifyInstance) {
	const ctrl = makeController<ReservationT>(
		'reservations',
		(data) => Reservation.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Reservation.parse(normalized);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar reservas',
				description:
					'Obtiene un listado paginado y ordenable de reservas. Las reservas representan pedidos de clientes que incluyen productos, cantidades, precios con promociones y suplementos, estado de entrega y pago. Por defecto se ordenan por createdAt descendente.',
				querystring: ReservationsQueryParams,
				response: {
					200: ReservationPageResponse.describe('Lista paginada de reservas'),
					400: ValidationErrorResponse.describe('Error de validación en parámetros'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
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
				summary: 'Obtener reserva por ID',
				description:
					'Devuelve los detalles completos de una reserva específica incluyendo el pedido (mapa de productos y cantidades), importe total, estado de entrega, estado de pago y toda la información asociada.',
				params: IdParam,
				response: {
					200: Reservation.describe('Reserva encontrada'),
					404: NotFoundResponse.describe('Reserva no encontrada'),
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
				summary: 'Crear nueva reserva',
				description:
					'Registra una nueva reserva para un evento. Incluye el pedido (productos y cantidades), cálculo de precios con promociones y suplementos según el tipo de consumo, anticipo, y métodos de pago.',
				body: ReservationCreate,
				response: {
					201: ReservationCreatedResponse.describe('Reserva creada exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
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
				summary: 'Reemplazar reserva completa',
				description:
					'Reemplaza todos los campos de una reserva existente (excepto eventId). Requiere proporcionar todos los campos obligatorios.',
				params: IdParam,
				body: ReservationReplace,
				response: {
					200: Reservation.describe('Reserva actualizada exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
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
				summary: 'Actualizar reserva parcialmente',
				description:
					'Actualiza uno o más campos de una reserva existente. Útil para marcar como entregada (isDelivered), pagada (isPaid), o modificar el pedido.',
				params: IdParam,
				body: ReservationPatch,
				response: {
					200: Reservation.describe('Reserva actualizada exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
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
				summary: 'Eliminar reserva',
				description:
					'Realiza un borrado lógico de la reserva (establece isActive=false). La reserva no se elimina físicamente de la base de datos.',
				params: IdParam,
				response: {
					204: NoContentResponse.describe('Reserva eliminada exitosamente'),
					404: NotFoundResponse.describe('Reserva no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
