import { z } from 'zod';
import { registry } from '../../infra/openapi/registry';
import { Event, EventCreate, EventReplace, EventPatch } from './schema';

// --- Componentes ---
registry.register('Event', Event);
registry.register('EventCreate', EventCreate);
registry.register('EventReplace', EventReplace);
registry.register('EventPatch', EventPatch);

const PaginationQuery = z.object({
    limit: z.number().int().min(5).max(50).optional(),
    after: z.string().nullable().optional(),
});
const PageMeta = z.object({
    limit: z.number().int().positive(),
    nextCursor: z.string().nullable().optional(),
    total: z.number().int().nonnegative(),
});
const EventPage = z.object({
    items: z.array(Event),
    page: PageMeta,
});

registry.register('PaginationQuery', PaginationQuery);
registry.register('EventPage', EventPage);

const TAG = 'Eventos';

// GET /events (lista paginada)
registry.registerPath({
    method: 'get',
    path: '/events',
    tag: TAG,
    summary: 'Listar eventos (paginado por cursor)',
    securityBearer: true,
    query: PaginationQuery,
    responses: [{ status: 200, description: 'Página de eventos', schema: EventPage }],
});

// GET /events/{id}
registry.registerPath({
    method: 'get',
    path: '/events/{id}',
    tag: TAG,
    summary: 'Obtener evento por id',
    securityBearer: true,
    params: z.object({ id: z.string().min(1) }),
    responses: [
        { status: 200, description: 'Evento', schema: Event },
        { status: 404, description: 'No encontrado' },
    ],
});

// POST /events
registry.registerPath({
    method: 'post',
    path: '/events',
    tag: TAG,
    summary: 'Crear evento',
    securityBearer: true,
    body: { schema: EventCreate },
    responses: [{ status: 201, description: 'Creado', schema: Event }],
});

// PUT /events/{id}
registry.registerPath({
    method: 'put',
    path: '/events/{id}',
    tag: TAG,
    summary: 'Reemplazar evento',
    securityBearer: true,
    params: z.object({ id: z.string().min(1) }),
    body: { schema: EventReplace },
    responses: [
        { status: 200, description: 'Actualizado', schema: Event },
        { status: 404, description: 'No encontrado' },
    ],
});

// PATCH /events/{id}
registry.registerPath({
    method: 'patch',
    path: '/events/{id}',
    tag: TAG,
    summary: 'Actualizar parcialmente un evento',
    securityBearer: true,
    params: z.object({ id: z.string().min(1) }),
    body: { schema: EventPatch },
    responses: [
        { status: 200, description: 'Actualizado', schema: Event },
        { status: 404, description: 'No encontrado' },
    ],
});

// DELETE /events/{id}
registry.registerPath({
    method: 'delete',
    path: '/events/{id}',
    tag: TAG,
    summary: 'Borrado (soft delete)',
    securityBearer: true,
    params: z.object({ id: z.string().min(1) }),
    responses: [{ status: 204, description: 'Eliminado' }],
});
