import type { FastifyInstance } from 'fastify';
import { makeController } from '../controller';
import { Expense, type ExpenseT } from './schema';

export default async function expensesRoutes(app: FastifyInstance) {
	const ctrl = makeController<ExpenseT>(
		'expenses',
		(data) => Expense.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			return Expense.parse({
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
