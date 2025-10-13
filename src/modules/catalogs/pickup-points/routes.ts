import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { PickupPoint, type PickupPointT } from '../schema';

export default async function pickup_pointsRoutes(app: FastifyInstance) {
	const ctrl = makeController<PickupPointT>(
		'pickup_points',
		(data) => PickupPoint.parse(data),
		(doc) => ({ id: String(doc._id), ...doc }),
	);
	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
