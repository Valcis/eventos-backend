import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Event, EventCreate, EventReplace, EventPatch, EventT } from './schema';
import { makeController } from '../controller';
import { isoifyFields } from '../../shared/lib/dates';

// Schemas de paginación (reutilizables)
const PaginationQuery = z.object({
	limit: z.number().int().min(5).max(50).optional().or(z.undefined()),
	after: z.string().optional().or(z.undefined()),
});

const PageMeta = z.object({
	limit: z.number().int().positive(),
	nextCursor: z.string().optional().or(z.undefined()),
	total: z.number().int().nonnegative(),
});

const EventPage = z.object({
	items: z.array(Event),
	page: PageMeta,
});

const IdParam = z.object({ id: z.string().min(1) });

export default async function eventsRoutes(app: FastifyInstance) {
	const ctrl = makeController<EventT>(
		'events',
		(data) => Event.parse(data),
		(doc) => {
			const { _id, ...rest } = doc;
			const base = {
				...(rest as Record<string, unknown>),
				id: String(_id),
			};
			const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
			return Event.parse(normalized);
		},
	);

	// GET /events
	app.get(
		'/',
		{
			schema: {
				tags: ['Eventos'],
				summary: 'Listar eventos (paginado)',
				querystring: PaginationQuery,
				response: {
					200: EventPage,
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.list,
	);

	// GET /events/:id
	app.get(
		'/:id',
		{
			schema: {
				tags: ['Eventos'],
				summary: 'Obtener evento por ID',
				params: IdParam,
				response: {
					200: Event,
					404: z.object({ error: z.string() }),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.get,
	);

	// POST /events
	app.post(
		'/',
		{
			schema: {
				tags: ['Eventos'],
				summary: 'Crear nuevo evento',
				body: EventCreate,
				response: {
					201: Event,
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.create,
	);

	// PUT /events/:id
	app.put(
		'/:id',
		{
			schema: {
				tags: ['Eventos'],
				summary: 'Reemplazar evento completo',
				params: IdParam,
				body: EventReplace,
				response: {
					200: Event,
					404: z.object({ error: z.string() }),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.replace,
	);

	// PATCH /events/:id
	app.patch(
		'/:id',
		{
			schema: {
				tags: ['Eventos'],
				summary: 'Actualización parcial',
				params: IdParam,
				body: EventPatch,
				response: {
					200: Event,
					404: z.object({ error: z.string() }),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.patch,
	);

	// DELETE /events/:id
	app.delete(
		'/:id',
		{
			schema: {
				tags: ['Eventos'],
				summary: 'Borrado lógico',
				params: IdParam,
				response: {
					204: z.null(),
				},
				security: [{ bearerAuth: [] }],
			},
		},
		ctrl.remove,
	);
}
