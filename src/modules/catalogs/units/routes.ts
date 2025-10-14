import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Unit, type UnitT } from '../schema';

export default async function unitsRoutes(app: FastifyInstance) {
	const ctrl = makeController<UnitT>(
		'units',
		(data) => Unit.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			return Unit.parse({
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
