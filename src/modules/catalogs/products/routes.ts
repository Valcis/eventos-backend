import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Product, type ProductT } from './schema';

export default async function productsRoutes(app: FastifyInstance) {
	const ctrl = makeController<ProductT>(
		'products',
		(data) => Product.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			return Product.parse({
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
