import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../controller';
import {
	Expense,
	ExpenseCreate,
	ExpenseReplace,
	ExpensePatch,
	type ExpenseT,
} from './schema';
import { isoifyFields } from '../../shared/lib/dates';
import { Id } from '../catalogs/zod.schemas';

const TAG = 'Gastos';

const PaginationQuery = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional(),
	after: z.string().optional(),
});

const IdParam = z.object({
	id: Id,
});

export default async function expensesRoutes(app: FastifyInstance) {
	const ctrl = makeController<ExpenseT>(
		'expenses',
		(data) => Expense.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);

			return Expense.parse(normalized);
		},
	);

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar gastos',
				description:
					'Obtiene un listado paginado de gastos. Los gastos representan compras de ingredientes, materiales o servicios para un evento.',
				querystring: PaginationQuery,
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.list,
	);

	app.get(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Obtener gasto por ID',
				description:
					'Devuelve los detalles completos de un gasto específico incluyendo información de precios, IVA, cantidades y verificación.',
				params: IdParam,
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.get,
	);

	app.post(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Crear nuevo gasto',
				description:
					'Registra un nuevo gasto para un evento. Incluye cálculos de IVA, precios base y netos, y gestión de paquetes.',
				body: ExpenseCreate,
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.create,
	);

	app.put(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Reemplazar gasto completo',
				description:
					'Reemplaza todos los campos de un gasto existente (excepto eventId). Requiere proporcionar todos los campos obligatorios.',
				params: IdParam,
				body: ExpenseReplace,
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.replace,
	);

	app.patch(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Actualizar gasto parcialmente',
				description:
					'Actualiza uno o más campos de un gasto existente. Solo los campos proporcionados serán modificados.',
				params: IdParam,
				body: ExpensePatch,
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.patch,
	);

	app.delete(
		'/:id',
		{
			schema: {
				tags: [TAG],
				summary: 'Eliminar gasto',
				description:
					'Realiza un borrado lógico del gasto (establece isActive=false). El gasto no se elimina físicamente de la base de datos.',
				params: IdParam,
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
