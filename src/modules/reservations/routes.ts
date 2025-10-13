import type { FastifyInstance } from 'fastify';
import { makeController } from '../controller';

export default async function reservationsRoutes(app: FastifyInstance) {
	{
		const ctrl = makeController<any>(
			'reservations',
			(d) => d as any,
			(doc) => ({ id: String(doc._id), ...doc }),
		);
		app.get('/', ctrl.list);
		app.get('/:id', ctrl.get);
		app.post('/', ctrl.create);
		app.put('/:id', ctrl.replace);
		app.patch('/:id', ctrl.patch);
		app.delete('/:id', ctrl.remove);
	}
}
