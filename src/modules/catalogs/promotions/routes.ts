import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Promotion, type PromotionT } from './schema';

export default async function promotionsRoutes(app: FastifyInstance) {
	const ctrl = makeController<PromotionT>(
		'promotions',
		(data) => Promotion.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			return Promotion.parse({
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
