import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Cashier, type CashierT } from '../schema';

export default async function cashiersRoutes(app: FastifyInstance) {
	const ctrl = makeController<CashierT>(
		'cashiers',
		(data) => Cashier.parse(data),
		(doc) => ({ id: String(doc._id), ...doc }),
	);
	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
