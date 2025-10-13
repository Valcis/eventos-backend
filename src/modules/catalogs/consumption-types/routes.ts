import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { ConsumptionType, type ConsumptionTypeT } from '../schema';

export default async function consumption_typesRoutes(app: FastifyInstance) {
	const ctrl = makeController<ConsumptionTypeT>(
		'consumption_types',
		(data) => ConsumptionType.parse(data),
		(doc) => ({ id: String(doc._id), ...doc }),
	);
	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
