import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Salesperson, type SalespersonT } from '../schema';

export default async function salespeopleRoutes(app: FastifyInstance) {
	const ctrl = makeController<SalespersonT>(
		'salespeople',
		(data) => Salesperson.parse(data),
		(doc) => ({ id: String(doc._id), ...doc }),
	);
	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
