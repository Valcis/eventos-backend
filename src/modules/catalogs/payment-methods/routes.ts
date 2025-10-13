import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { PaymentMethod, type PaymentMethodT } from '../schema';

export default async function payment_methodsRoutes(app: FastifyInstance) {
	const ctrl = makeController<PaymentMethodT>(
		'payment_methods',
		(data) => PaymentMethod.parse(data),
		(doc) => ({ id: String(doc._id), ...doc }),
	);
	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
