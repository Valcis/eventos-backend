import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { makeController } from '../../controller';
import {
	Promotion,
	PromotionCreate,
	PromotionReplace,
	PromotionPatch,
	type PromotionT,
} from './schema';
import { isoifyFields } from '../../../shared/lib/dates';
import { Id } from '../zod.schemas';

const TAG = 'Promociones';

const PaginationQuery = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional(),
	after: z.string().optional(),
});

const IdParam = z.object({
	id: Id,
});

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

	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Listar promociones',
				description:
					'Obtiene un listado paginado de promociones. Las promociones son reglas de descuento aplicables a productos (3x2, porcentajes, combos, etc.).',
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
				summary: 'Obtener promoción por ID',
				description:
					'Devuelve los detalles completos de una promoción específica incluyendo regla, condiciones, productos aplicables, fechas de vigencia y prioridad.',
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
				summary: 'Crear nueva promoción',
				description:
					'Registra una nueva promoción para un evento. Soporta múltiples tipos de reglas: 3x2, descuentos por unidad, precios por bloque, porcentajes, combos, bundles y más.',
				body: PromotionCreate,
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
				summary: 'Reemplazar promoción completa',
				description:
					'Reemplaza todos los campos de una promoción existente (excepto eventId). Requiere proporcionar todos los campos obligatorios.',
				params: IdParam,
				body: PromotionReplace,
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
				summary: 'Actualizar promoción parcialmente',
				description:
					'Actualiza uno o más campos de una promoción existente. Útil para extender fechas, cambiar prioridad o modificar condiciones.',
				params: IdParam,
				body: PromotionPatch,
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
				summary: 'Eliminar promoción',
				description:
					'Realiza un borrado lógico de la promoción (establece isActive=false). La promoción no se elimina físicamente de la base de datos.',
				params: IdParam,
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
