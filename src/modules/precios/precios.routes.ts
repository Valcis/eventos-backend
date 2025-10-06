import {FastifyInstance} from "fastify";
import {PreciosRepo} from "./precios.repo";
import {parsePage, parsePageSize} from "../../utils/pagination";
import {parseSort, toMongoSort} from "../../core/filters/sort";
import {requireDb} from "../../infra/mongo/db-access";

type PrecioSortField = "createdAt";
const PRECIO_SORT_WHITELIST: readonly PrecioSortField[] = ["createdAt"] as const;

/** JSON Schemas */
const preciosQueryJsonSchema = {
    type: "object",
    properties: {
        page: {type: "string"},
        pageSize: {type: "string"},
        sort: {type: "string", description: "createdAt:asc | createdAt:desc"},
        productoId: {type: "string"},
    },
    additionalProperties: false,
} as const;

const precioDataJsonSchema = {
    type: "object",
    properties: {
        id: {type: "string"},
        eventId: {type: "string"},
        productoId: {type: "string"},
        precio: {type: "string"},
        createdAt: {type: "string", format: "date-time"},
        updatedAt: {type: "string", format: "date-time"},
    },
    required: ["id", "eventId", "productoId", "precio", "createdAt"],
    additionalProperties: false,
} as const;

const listEnvelope = {
    type: "object",
    properties: {
        ok: {const: true},
        data: {type: "array", items: precioDataJsonSchema},
        meta: {
            type: "object",
            properties: {
                page: {type: "integer", minimum: 0},
                pageSize: {type: "integer", minimum: 1},
                totalItems: {type: "integer", minimum: 0},
                totalPages: {type: "integer", minimum: 0},
            },
            required: ["page", "pageSize", "totalItems", "totalPages"],
            additionalProperties: false,
        },
    },
    required: ["ok", "data", "meta"],
    additionalProperties: false,
} as const;

const itemEnvelope = {
    type: "object",
    properties: {ok: {const: true}, data: precioDataJsonSchema},
    required: ["ok", "data"],
    additionalProperties: false,
} as const;

const boolEnvelope = {
    type: "object",
    properties: {
        ok: {const: true},
        data: {
            type: "object",
            properties: {deleted: {type: "boolean"}},
            required: ["deleted"],
            additionalProperties: false
        },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const;

const errorEnvelope = {
    type: "object",
    properties: {ok: {const: false}, code: {type: "string"}, message: {type: "string"}},
    required: ["ok", "code", "message"],
    additionalProperties: false,
} as const;

type GetPreciosQuery = { page?: string; pageSize?: string; sort?: string; productoId?: string };
type GetPreciosParams = { eventId: string };
type PostPreciosBody = { eventId: string; productoId: string; precio: string };
type PutPreciosBody = { productoId?: string; precio?: string };

export default async function preciosRoutes(app: FastifyInstance): Promise<void> {
    const db = requireDb(app);
    const repo = new PreciosRepo(db);

    // GET
    app.get<{ Querystring: GetPreciosQuery; Params: GetPreciosParams }>(
        "/events/:eventId/precios",
        {
            schema: {
                summary: "Listar precios por evento",
                querystring: preciosQueryJsonSchema,
                response: {200: listEnvelope, 400: errorEnvelope},
                tags: ["precios"]
            }
        },
        async (req, reply) => {
            const page = parsePage(req.query.page);
            const pageSize = parsePageSize(req.query.pageSize);
            const sortParsed = parseSort<PrecioSortField>(req.query.sort, PRECIO_SORT_WHITELIST, {
                field: "createdAt",
                direction: -1
            });
            const sort = toMongoSort(sortParsed);

            const {items, totalItems} = await repo.list({
                eventId: req.params.eventId,
                productoId: req.query.productoId,
                sort,
                page,
                pageSize
            });
            return reply.send({
                ok: true as const,
                data: items,
                meta: {page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize)}
            });
        }
    );

    // POST
    app.post<{ Body: PostPreciosBody }>(
        "/precios",
        {
            schema: {
                summary: "Crear precio",
                body: {
                    type: "object",
                    required: ["eventId", "productoId", "precio"],
                    properties: {
                        eventId: {type: "string"},
                        productoId: {type: "string"},
                        precio: {type: "string", pattern: "^-?\\d+(\\.\\d+)?$"},
                    },
                    additionalProperties: false,
                },
                response: {200: itemEnvelope, 400: errorEnvelope},
                tags: ["precios"],
            },
        },
        async (req, reply) => {
            try {
                const created = await repo.insertOne({
                    eventId: req.body.eventId,
                    productoId: req.body.productoId,
                    precio: req.body.precio
                });
                return reply.send({ok: true as const, data: created});
            } catch (error) {
                app.log.error({err: error, route: "POST /precios", requestId: (req as unknown as { id: string }).id});
                return reply.status(400).send({
                    ok: false as const,
                    code: "CREATE_FAILED",
                    message: "No se pudo crear el precio"
                });
            }
        }
    );

    // PUT
    app.put<{ Params: { id: string }; Body: PutPreciosBody }>(
        "/precios/:id",
        {
            schema: {
                summary: "Actualizar precio por id",
                params: {
                    type: "object",
                    properties: {id: {type: "string"}},
                    required: ["id"],
                    additionalProperties: false
                },
                body: {
                    type: "object",
                    properties: {
                        productoId: {type: "string"},
                        precio: {type: "string", pattern: "^-?\\d+(\\.\\d+)?$"},
                    },
                    minProperties: 1,
                    additionalProperties: false,
                },
                response: {200: itemEnvelope, 404: errorEnvelope, 409: errorEnvelope},
                tags: ["precios"],
            },
        },
        async (req, reply) => {
            try {
                const updated = await repo.updateById(req.params.id, req.body);
                if (!updated) {
                    return reply.status(404).send({
                        ok: false as const,
                        code: "NOT_FOUND",
                        message: "Precio no encontrado"
                    });
                }
                return reply.send({ok: true as const, data: updated});
            } catch (err) {
                const maybe = err as { code?: number };
                if (maybe && maybe.code === 11000) {
                    return reply.status(409).send({
                        ok: false as const,
                        code: "DUPLICATE",
                        message: "Ya existe un precio con ese (eventId, productoId)"
                    });
                }
                throw err;
            }
        }
    );

    // DELETE
    app.delete<{ Params: { id: string } }>(
        "/precios/:id",
        {
            schema: {
                summary: "Eliminar precio por id",
                params: {
                    type: "object",
                    properties: {id: {type: "string"}},
                    required: ["id"],
                    additionalProperties: false
                },
                response: {200: boolEnvelope, 404: errorEnvelope},
                tags: ["precios"]
            }
        },
        async (req, reply) => {
            const deleted = await repo.deleteById(req.params.id);
            if (!deleted) return reply.status(404).send({
                ok: false as const,
                code: "NOT_FOUND",
                message: "Precio no encontrado"
            });
            return reply.send({ok: true as const, data: {deleted: true}});
        }
    );
}
