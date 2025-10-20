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

const TAG = 'Reservas';

const PaginationQuery = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional(),
	after: z.string().optional(),
});

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
					'Obtiene un listado paginado de reservas. Las reservas representan pedidos de clientes que incluyen productos, cantidades, precios con promociones y suplementos, estado de entrega y pago.',
				querystring: PaginationQuery,
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
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
