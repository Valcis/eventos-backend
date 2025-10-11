import {FastifyInstance} from "fastify";
import {ReservasRepo} from "./reservas.repo";
import {parsePage, parsePageSize} from "../../utils/pagination";
import {parseSort, toMongoSort} from "../../core/filters/sort";
import {requireDb} from "../../infra/mongo/db-access";
import {ReservaEstado} from "./reservas.types";

type ReservaSortField = "createdAt";
const RESERVA_SORT_WHITELIST: readonly ReservaSortField[] = ["createdAt"] as const;

/** JSON Schemas */
const reservasQueryJsonSchema = {
    type: "object",
    properties: {
        page: {type: "string"},
        pageSize: {type: "string"},
        sort: {type: "string", description: "createdAt:asc | createdAt:desc"},
        estado: {type: "string", enum: ["pendiente", "confirmada", "cancelada"]},
    },
    additionalProperties: false,
} as const;

const reservaDataJsonSchema = {
    type: "object",
    properties: {
        id: {type: "string"},
        eventId: {type: "string"},
        estado: {type: "string", enum: ["pendiente", "confirmada", "cancelada"]},
        createdAt: {type: "string", format: "date-time"},
        updatedAt: {type: "string", format: "date-time"},
    },
    required: ["id", "eventId", "estado", "createdAt"],
    additionalProperties: false,
} as const;

const listEnvelope = {
    type: "object",
    properties: {
        ok: {const: true},
        data: {type: "array", items: reservaDataJsonSchema},
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
    properties: {ok: {const: true}, data: reservaDataJsonSchema},
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

type GetReservasQuery = { page?: string; pageSize?: string; sort?: string; estado?: ReservaEstado };
type GetReservasParams = { eventId: string };
type PostReservasBody = { eventId: string; estado?: ReservaEstado };
type PutReservasBody = { estado?: ReservaEstado };

export default async function reservasRoutes(app: FastifyInstance): Promise<void> {
    const db = requireDb(app);
    const repo = new ReservasRepo(db);

    // GET
    app.get<{ Querystring: GetReservasQuery; Params: GetReservasParams }>(
        "/events/:eventId/reservas",
        {
            schema: {
                summary: "Listar reservas por evento",
                querystring: reservasQueryJsonSchema,
                response: {200: listEnvelope, 400: errorEnvelope},
                tags: ["reservas"]
            }
        },
        async (req, reply) => {
            const page = parsePage(req.query.page);
            const pageSize = parsePageSize(req.query.pageSize);
            const sortParsed = parseSort<ReservaSortField>(req.query.sort, RESERVA_SORT_WHITELIST, {
                field: "createdAt",
                direction: -1
            });
            const sort = toMongoSort(sortParsed);

            const {items, totalItems} = await repo.list({
                eventId: req.params.eventId,
                estado: req.query.estado,
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
    app.post<{ Body: PostReservasBody }>(
        "/reservas",
        {
            schema: {
                summary: "Crear reserva",
                body: {
                    type: "object",
                    required: ["eventId"],
                    properties: {
                        eventId: {type: "string"},
                        estado: {type: "string", enum: ["pendiente", "confirmada", "cancelada"]}
                    },
                    additionalProperties: false,
                },
                response: {200: itemEnvelope, 400: errorEnvelope},
                tags: ["reservas"],
            },
        },
        async (req, reply) => {
            try {
                const created = await repo.insertOne({eventId: req.body.eventId, estado: req.body.estado});
                return reply.send({ok: true as const, data: created});
            } catch (error) {
                app.log.error({err: error, route: "POST /reservas", requestId: (req as unknown as { id: string }).id});
                return reply.status(400).send({
                    ok: false as const,
                    code: "CREATE_FAILED",
                    message: "No se pudo crear la reserva"
                });
            }
        }
    );

    // PUT
    app.put<{ Params: { id: string }; Body: PutReservasBody }>(
        "/reservas/:id",
        {
            schema: {
                summary: "Actualizar reserva por id",
                params: {
                    type: "object",
                    properties: {id: {type: "string"}},
                    required: ["id"],
                    additionalProperties: false
                },
                body: {
                    type: "object",
                    properties: {estado: {type: "string", enum: ["pendiente", "confirmada", "cancelada"]}},
                    minProperties: 1,
                    additionalProperties: false,
                },
                response: {200: itemEnvelope, 404: errorEnvelope},
                tags: ["reservas"],
            },
        },
        async (req, reply) => {
            const updated = await repo.updateById(req.params.id, req.body);
            if (!updated) {
                return reply.status(404).send({
                    ok: false as const,
                    code: "NOT_FOUND",
                    message: "Reserva no encontrada"
                });
            }
            return reply.send({ok: true as const, data: updated});
        }
    );

    // DELETE
    app.delete<{ Params: { id: string } }>(
        "/reservas/:id",
        {
            schema: {
                summary: "Eliminar reserva por id",
                params: {
                    type: "object",
                    properties: {id: {type: "string"}},
                    required: ["id"],
                    additionalProperties: false
                },
                response: {200: boolEnvelope, 404: errorEnvelope},
                tags: ["reservas"]
            }
        },
        async (req, reply) => {
            const deleted = await repo.deleteById(req.params.id);
            if (!deleted) return reply.status(404).send({
                ok: false as const,
                code: "NOT_FOUND",
                message: "Reserva no encontrada"
            });
            return reply.send({ok: true as const, data: {deleted: true}});
        }
    );
}
