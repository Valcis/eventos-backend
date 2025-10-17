import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Promotion, type PromotionT } from './schema';
import { isoifyFields } from '../../../shared/lib/dates';

export default async function promotionsRoutes(app: FastifyInstance) {
	const ctrl = makeController<PromotionT>(
		'promotions',
		(data) => Promotion.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, [
				'startDate',
				'endDate',
				'createdAt',
				'updatedAt',
			] as const);

			return Promotion.parse(normalized);
		},
	);

	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
