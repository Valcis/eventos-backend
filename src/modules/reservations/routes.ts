import type { FastifyInstance } from 'fastify';
import { makeController } from '../controller';
import { Reservation, type ReservationT } from './schema';

export default async function reservationsRoutes(app: FastifyInstance) {
	const ctrl = makeController<ReservationT>(
		'reservations',
		(data) => Reservation.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			return Reservation.parse({
				...(rest as unknown as Record<string, unknown>),
				id: String(_id),
			});
		},
	);

	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
