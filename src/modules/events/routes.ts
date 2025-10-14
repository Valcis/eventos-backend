import type { FastifyInstance } from 'fastify';
import { makeController } from '../controller';
import { Event, type EventT } from './schema';

export default async function eventsRoutes(app: FastifyInstance) {
	const ctrl = makeController<EventT>(
		'events',
		(data) => Event.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			return Event.parse({
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
