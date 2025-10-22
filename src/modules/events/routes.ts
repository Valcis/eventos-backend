import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {Event, EventCreate, EventReplace, EventPatch, EventT} from './schema';
import {makeController} from '../controller';
import {isoifyFields} from '../../shared/lib/dates';
import {
    createPagedResponse, createCreatedResponse, NotFoundResponse, ValidationErrorResponse, UnauthorizedResponse,
    InternalErrorResponse, NoContentResponse, ConflictResponse,
} from '../../shared/schemas/responses';

// Schemas de paginación y filtros
const EventsQueryParams = z.object({
    // Paginación
    limit: z.coerce.number().int().min(5).max(50).optional().describe('Número de resultados por página (5-50). Default: 15'),
    after: z.string().optional().describe('Cursor para paginación (ID del último elemento de la página anterior)'),
    // Ordenación
    sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'date']).optional().describe('Campo por el cual ordenar. Default: createdAt'),
    sortDir: z.enum(['asc', 'desc']).optional().describe('Dirección de ordenación: "asc" (ascendente) o "desc" (descendente). Default: desc'),
    // Filtros opcionales
    name: z.string().optional().describe('Filtrar por nombre del evento (búsqueda parcial, case-insensitive). Ejemplo: "Feria"'),
    date: z.string().datetime().optional().describe('Filtrar eventos desde esta fecha en adelante (>=). Formato ISO 8601. Ejemplo: "2025-06-15T12:00:00.000Z"'),
    createdAt: z.string().datetime().optional().describe('Filtrar eventos creados desde esta fecha en adelante (>=). Formato ISO 8601. Ejemplo: "2025-10-20T13:34:58.180Z"'),
});

// Schemas de respuesta
const EventPageResponse = createPagedResponse(Event, 'eventos');
const EventCreatedResponse = createCreatedResponse(Event, 'Evento');

const IdParam = z.object({id: z.string().min(1)});

export default async function eventsRoutes(app: FastifyInstance) {
    const ctrl = makeController<EventT>(
        'events',
        (data) => Event.parse(data),
        (doc) => {
            const {_id, ...rest} = doc;
            const base = {
                ...(rest as Record<string, unknown>),
                id: String(_id),
            };
            const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
            return Event.parse(normalized);
        },
    );

    // GET /events - Listar eventos paginados con filtros opcionales
    app.get('/',
        {
            schema: {
                tags: ['Eventos'],
                summary: 'Listar eventos',
                description:
                    'Obtiene un listado paginado y ordenable de eventos con filtros opcionales. Los eventos son la entidad raíz que agrupa todos los catálogos, productos, reservas y gastos de un evento específico. Puedes filtrar por nombre (búsqueda parcial), fecha del evento o fecha de creación. Por defecto se ordenan por fecha de creación descendente (más recientes primero).',
                querystring: EventsQueryParams,
                response: {
                    200: EventPageResponse.describe('Lista paginada de eventos con metadatos de paginación'),
                    400: ValidationErrorResponse.describe('Error de validación en los parámetros de consulta'),
                    401: UnauthorizedResponse.describe('Token de autenticación inválido o faltante'),
                    500: InternalErrorResponse.describe('Error interno del servidor'),
                },
                security: [{bearerAuth: []}],
            },
        },
        async (req, reply) => {
            // Handler personalizado para procesar filtros de eventos
            type QInput = z.infer<typeof EventsQueryParams>;
            const db = (req.server as unknown as { db: import('mongodb').Db }).db;
            const query = req.query as QInput;
            const {ObjectId} = await import('mongodb');

            // Separar paginación, ordenación y filtros
            const {limit: rawLimit, after, sortBy = 'createdAt', sortDir = 'desc', name, date, createdAt} = query;
            const limit = rawLimit || 15;

            // Construir filtros de MongoDB
            const mongoFilters: Record<string, unknown> = {};

            // Construir sort de MongoDB
            const mongoSortDir = sortDir === 'asc' ? 1 : -1;
            const mongoSort: Record<string, 1 | -1> = {
                [sortBy]: mongoSortDir,
                _id: mongoSortDir, // tie-breaker
            };

            // Filtro por nombre: búsqueda parcial case-insensitive
            if (name) {
                mongoFilters.name = {$regex: name, $options: 'i'};
            }

            // Filtro por fecha del evento: desde esta fecha en adelante (>=)
            if (date) {
                mongoFilters.date = { $gte: new Date(date) };
            }

            // Filtro por fecha de creación: desde esta fecha en adelante (>=)
            if (createdAt) {
                mongoFilters.createdAt = { $gte: new Date(createdAt) };
            }

            // Cursor: si hay "after", agregamos filtro _id > after
            if (after && ObjectId.isValid(after)) {
                mongoFilters._id = {$gt: new ObjectId(after)};
            }

            // Ejecutar query con paginación y ordenación
            const docs = await db
                .collection('events')
                .find(mongoFilters)
                .sort(mongoSort)
                .limit(limit)
                .toArray();

            // Obtener total (sin paginación)
            const total = await db.collection('events').countDocuments({
                ...(name && {name: {$regex: name, $options: 'i'}}),
                ...(date && {date: { $gte: new Date(date) }}),
                ...(createdAt && {createdAt: { $gte: new Date(createdAt) }}),
            });

            // Mapear documentos a dominio
            const items = docs.map((doc) => {
                const {_id, ...rest} = doc;
                const base = {
                    ...rest,
                    id: String(_id),
                };
                const normalized = isoifyFields(base, ['date', 'createdAt', 'updatedAt'] as const);
                return Event.parse(normalized);
            });

            // Calcular nextCursor
            const lastDoc = docs[docs.length - 1];
            const nextCursor = docs.length === limit && lastDoc ? String(lastDoc._id) : null;

            return reply.send({
                items,
                page: {
                    limit,
                    nextCursor,
                    total,
                },
            });
        },
    );

    // GET /events/:id - Obtener evento por ID
    app.get('/:id',
        {
            schema: {
                tags: ['Eventos'],
                summary: 'Obtener evento por ID',
                description: 'Recupera la información completa de un evento específico por su ID',
                params: IdParam,
                response: {
                    200: Event.describe('Evento encontrado con todos sus datos'),
                    400: ValidationErrorResponse.describe('ID inválido (formato incorrecto)'),
                    401: UnauthorizedResponse.describe('Token de autenticación inválido o faltante'),
                    404: NotFoundResponse.describe('Evento no encontrado con el ID proporcionado'),
                    500: InternalErrorResponse.describe('Error interno del servidor'),
                },
                security: [{bearerAuth: []}],
            },
        },
        ctrl.get,
    );

    // POST /events - Crear nuevo evento
    app.post(
        '/',
        {
            schema: {
                tags: ['Eventos'],
                summary: 'Crear nuevo evento',
                description:
                    'Crea un nuevo evento en el sistema. El evento es la entidad padre de todos los catálogos, productos y reservas. Los campos id, createdAt y updatedAt son generados automáticamente. No se permiten eventos duplicados con el mismo nombre y fecha.',
                body: EventCreate,
                response: {
                    201: EventCreatedResponse.describe('Evento creado exitosamente con ID y timestamps generados'),
                    400: ValidationErrorResponse.describe('Error de validación en los datos enviados (campos faltantes o con formato incorrecto)'),
                    401: UnauthorizedResponse.describe('Token de autenticación inválido o faltante'),
                    409: ConflictResponse.describe('Ya existe un evento con el mismo nombre y fecha'),
                    500: InternalErrorResponse.describe('Error interno del servidor'),
                },
                security: [{bearerAuth: []}],
            },
        },
        async (req, reply) => {
            // Handler personalizado con validación de duplicados
            const db = (req.server as unknown as { db: import('mongodb').Db }).db;
            const body = req.body as z.infer<typeof EventCreate>;

            // Verificar si ya existe un evento con el mismo nombre y fecha
            const existing = await db.collection('events').findOne({
                name: body.name,
                date: new Date(body.date),
                isActive: true,
            });

            if (existing) {
                const { ConflictError } = await import('../../core/http/errors');
                throw new ConflictError(
                    `Ya existe un evento activo con el nombre "${body.name}" en la fecha ${body.date}. Por favor usa otro nombre o fecha.`,
                );
            }

            // Si no hay duplicado, crear el evento usando el controlador
            return ctrl.create(req, reply);
        },
    );

    // PUT /events/:id - Reemplazar evento completo
    app.put('/:id',
        {
            schema: {
                tags: ['Eventos'],
                summary: 'Reemplazar evento completo',
                description:
                    'Reemplaza todos los campos del evento (excepto id y timestamps). Los campos no enviados se establecerán a sus valores por defecto. Usa PATCH para actualización parcial.',
                params: IdParam,
                body: EventReplace,
                response: {
                    200: Event.describe('Evento actualizado exitosamente con todos los nuevos valores'),
                    400: ValidationErrorResponse.describe('Error de validación en los datos enviados o ID inválido'),
                    401: UnauthorizedResponse.describe('Token de autenticación inválido o faltante'),
                    404: NotFoundResponse.describe('Evento no encontrado con el ID proporcionado'),
                    500: InternalErrorResponse.describe('Error interno del servidor'),
                },
                security: [{bearerAuth: []}],
            },
        },
        ctrl.replace,
    );

    // PATCH /events/:id - Actualización parcial
    app.patch('/:id',
        {
            schema: {
                tags: ['Eventos'],
                summary: 'Actualización parcial de evento',
                description:
                    'Actualiza solo los campos especificados del evento. Los campos no enviados mantienen su valor actual. Ideal para cambios pequeños sin enviar todo el objeto.',
                params: IdParam,
                body: EventPatch,
                response: {
                    200: Event.describe('Evento actualizado exitosamente con los campos modificados'),
                    400: ValidationErrorResponse.describe('Error de validación en los datos enviados o ID inválido'),
                    401: UnauthorizedResponse.describe('Token de autenticación inválido o faltante'),
                    404: NotFoundResponse.describe('Evento no encontrado con el ID proporcionado'),
                    500: InternalErrorResponse.describe('Error interno del servidor'),
                },
                security: [{bearerAuth: []}],
            },
        },
        ctrl.patch,
    );

    // DELETE /events/:id - Borrado lógico
    app.delete('/:id',
        {
            schema: {
                tags: ['Eventos'],
                summary: 'Borrado lógico de evento',
                description:
                    'Marca el evento como inactivo (isActive = false). El evento y todas sus entidades relacionadas no se eliminan físicamente de la base de datos, solo se ocultan.',
                params: IdParam,
                response: {
                    204: NoContentResponse.describe('Evento marcado como inactivo exitosamente (sin contenido en respuesta)'),
                    400: ValidationErrorResponse.describe('ID inválido (formato incorrecto)'),
                    401: UnauthorizedResponse.describe('Token de autenticación inválido o faltante'),
                    404: NotFoundResponse.describe('Evento no encontrado con el ID proporcionado'),
                    500: InternalErrorResponse.describe('Error interno del servidor'),
                },
                security: [{bearerAuth: []}],
            },
        },
        ctrl.remove,
    );
}
