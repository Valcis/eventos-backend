import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Cashier, type CashierT } from '../schema';
import { isoifyFields } from '../../../shared/lib/dates';

export default async function cashiersRoutes(app: FastifyInstance) {
	const ctrl = makeController<CashierT>(
		'cashiers',
		(data) => Cashier.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Cashier.parse(normalized);
		},
	);

	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
