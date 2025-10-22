import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../controller';
import { Expense, ExpenseCreate, ExpenseReplace, ExpensePatch, type ExpenseT } from './schema';
import { isoifyFields } from '../../shared/lib/dates';
import { Id } from '../catalogs/zod.schemas';
import {
	createPagedResponse,
	createCreatedResponse,
	NotFoundResponse,
	ValidationErrorResponse,
	UnauthorizedResponse,
	InternalErrorResponse,
	NoContentResponse,
} from '../../shared/schemas/responses';

const TAG = 'Gastos';

const ExpensesQueryParams = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(5)
		.max(50)
		.optional()
		.describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z
		.enum(['createdAt', 'updatedAt', 'netPrice'])
		.optional()
		.describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	ingredient: z
		.string()
		.optional()
		.describe('Filtrar por nombre del ingrediente (búsqueda parcial)'),
	isVerified: z.coerce.boolean().optional().describe('Filtrar por estado de verificación'),
});

const ExpensePageResponse = createPagedResponse(Expense, 'gastos');
const ExpenseCreatedResponse = createCreatedResponse(Expense, 'Gasto');

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
					'Obtiene un listado paginado y ordenable de gastos. Los gastos representan compras de ingredientes, materiales o servicios para un evento. Por defecto se ordenan por createdAt descendente.',
				querystring: ExpensesQueryParams,
				response: {
					200: ExpensePageResponse.describe('Lista paginada de gastos'),
					400: ValidationErrorResponse.describe('Error de validación en parámetros'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
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
				response: {
					200: Expense.describe('Gasto encontrado'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
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
				response: {
					201: ExpenseCreatedResponse.describe('Gasto creado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
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
				response: {
					200: Expense.describe('Gasto actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
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
				response: {
					200: Expense.describe('Gasto actualizado exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
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
				response: {
					204: NoContentResponse.describe('Gasto eliminado exitosamente'),
					404: NotFoundResponse.describe('Gasto no encontrado'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
