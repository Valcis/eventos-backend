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
import {
	createPagedResponse,
	createCreatedResponse,
	NotFoundResponse,
	ValidationErrorResponse,
	UnauthorizedResponse,
	InternalErrorResponse,
	NoContentResponse,
} from '../../../shared/schemas/responses';

const TAG = 'Promociones';

const PromotionsQueryParams = z.object({
	limit: z.coerce.number().int().min(5).max(50).optional().describe('Número de resultados por página (5-50). Default: 15'),
	after: z.string().optional().describe('Cursor para paginación'),
	sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'priority', 'startDate', 'endDate']).optional().describe('Campo de ordenación. Default: createdAt'),
	sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación. Default: desc'),
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
	name: z.string().optional().describe('Filtrar por nombre (búsqueda parcial)'),
});

const PromotionPageResponse = createPagedResponse(Promotion, 'promociones');
const PromotionCreatedResponse = createCreatedResponse(Promotion, 'Promoción');

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
					'Obtiene un listado paginado y ordenable de promociones. Las promociones son reglas de descuento aplicables a productos (3x2, porcentajes, combos, etc.). Por defecto se ordenan por createdAt descendente.',
				querystring: PromotionsQueryParams,
				response: {
					200: PromotionPageResponse.describe('Lista paginada de promociones'),
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
				summary: 'Obtener promoción por ID',
				description:
					'Devuelve los detalles completos de una promoción específica incluyendo regla, condiciones, productos aplicables, fechas de vigencia y prioridad.',
				params: IdParam,
				response: {
					200: Promotion.describe('Promoción encontrada'),
					404: NotFoundResponse.describe('Promoción no encontrada'),
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
				summary: 'Crear nueva promoción',
				description:
					'Registra una nueva promoción para un evento. Soporta múltiples tipos de reglas: 3x2, descuentos por unidad, precios por bloque, porcentajes, combos, bundles y más.',
				body: PromotionCreate,
				response: {
					201: PromotionCreatedResponse.describe('Promoción creada exitosamente'),
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
				summary: 'Reemplazar promoción completa',
				description:
					'Reemplaza todos los campos de una promoción existente (excepto eventId). Requiere proporcionar todos los campos obligatorios.',
				params: IdParam,
				body: PromotionReplace,
				response: {
					200: Promotion.describe('Promoción actualizada exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Promoción no encontrada'),
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
				summary: 'Actualizar promoción parcialmente',
				description:
					'Actualiza uno o más campos de una promoción existente. Útil para extender fechas, cambiar prioridad o modificar condiciones.',
				params: IdParam,
				body: PromotionPatch,
				response: {
					200: Promotion.describe('Promoción actualizada exitosamente'),
					400: ValidationErrorResponse.describe('Error de validación en el body'),
					404: NotFoundResponse.describe('Promoción no encontrada'),
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
				summary: 'Eliminar promoción',
				description:
					'Realiza un borrado lógico de la promoción (establece isActive=false). La promoción no se elimina físicamente de la base de datos.',
				params: IdParam,
				response: {
					204: NoContentResponse.describe('Promoción eliminada exitosamente'),
					404: NotFoundResponse.describe('Promoción no encontrada'),
					401: UnauthorizedResponse.describe('Token inválido o faltante'),
					500: InternalErrorResponse.describe('Error interno del servidor'),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
