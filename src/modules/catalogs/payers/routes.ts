import type { FastifyInstance } from 'fastify';
import { makeController } from '../../controller';
import { Payer, type PayerT } from '../schema';
import {isoifyFields} from "../../../shared/lib/dates";

export default async function payersRoutes(app: FastifyInstance) {
	const ctrl = makeController<PayerT>(
		'payers',
		(data) => Payer.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
            const base = {
                ...(rest as Record<string, unknown>),
                id: String(_id),
            };
            const normalized = isoifyFields(base, [
                'date',
                'createdAt',
                'updatedAt',
            ] as const);

            return Payer.parse(normalized);
		},
	);

	app.get('/', ctrl.list);
	app.get('/:id', ctrl.get);
	app.post('/', ctrl.create);
	app.put('/:id', ctrl.replace);
	app.patch('/:id', ctrl.patch);
	app.delete('/:id', ctrl.remove);
}
