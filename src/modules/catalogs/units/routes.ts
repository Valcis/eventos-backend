import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Unit, type UnitT } from '../schema';
import { isoifyFields } from '../../../shared/lib/dates';

export default async function unitsRoutes(app: FastifyInstance) {
	const ctrl = makeController<UnitT>(
		'units',
		(data) => Unit.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Unit.parse(normalized);
		},
	);

	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
