import {FastifyInstance} from "fastify";
import {GastosRepo} from "./gastos.repo";
import {parsePage, parsePageSize} from "../../utils/pagination";
import {parseSort, toMongoSort} from "../../core/filters/sort";
import {requireDb} from "../../infra/mongo/db-access";

type GastoSortField = "createdAt";
const GASTO_SORT_WHITELIST: readonly GastoSortField[] = ["createdAt"] as const;

/** JSON Schemas */
const gastosQueryJsonSchema = {
    type: "object",
    properties: {
        page: {type: "string"},
        pageSize: {type: "string"},
        sort: {type: "string", description: "createdAt:asc | createdAt:desc"},
        comprobado: {type: "string", enum: ["true", "false"]},
        q: {type: "string"},
    },
    additionalProperties: false,
} as const;

const gastoDataJsonSchema = {
    type: "object",
    properties: {
        id: {type: "string"},
        eventId: {type: "string"},
        importe: {type: "string"},
        descripcion: {type: "string"},
        proveedor: {type: "string"},
        comprobado: {type: "boolean"},
        createdAt: {type: "string", format: "date-time"},
        updatedAt: {type: "string", format: "date-time"},
    },
    required: ["id", "eventId", "importe", "comprobado", "createdAt"],
    additionalProperties: false,
} as const;

const listEnvelope = {
    type: "object",
    properties: {
        ok: {const: true},
        data: {type: "array", items: gastoDataJsonSchema},
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
    properties: {ok: {const: true}, data: gastoDataJsonSchema},
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
    additionalProperties: true,
} as const;

type GetGastosQuery = { page?: string; pageSize?: string; sort?: string; comprobado?: "true" | "false"; q?: string };
type GetGastosParams = { eventId: string };
type PostGastosBody = {
    eventId: string;
    importe: string;
    descripcion?: string | null;
    proveedor?: string | null;
    comprobado?: boolean
};
type PutGastosBody = { importe?: string; descripcion?: string | null; proveedor?: string | null; comprobado?: boolean };

export default async function gastosRoutes(app: FastifyInstance): Promise<void> {
    const db = requireDb(app);
    const repo = new GastosRepo(db);

    // GET
    app.get<{ Querystring: GetGastosQuery; Params: GetGastosParams }>(
        "/events/:eventId/gastos",
        {
            schema: {
                summary: "Listar gastos por evento",
                querystring: gastosQueryJsonSchema,
                response: {200: listEnvelope, 400: errorEnvelope},
                tags: ["gastos"]
            }
        },
        async (req, reply) => {
            const page = parsePage(req.query.page);
            const pageSize = parsePageSize(req.query.pageSize);
            const sortParsed = parseSort<GastoSortField>(req.query.sort, GASTO_SORT_WHITELIST, {
                field: "createdAt",
                direction: -1
            });
            const sort = toMongoSort(sortParsed);
            const filterComprobado = req.query.comprobado === "true" ? true : req.query.comprobado === "false" ? false : undefined;

            const {items, totalItems} = await repo.list({
                eventId: req.params.eventId,
                filterComprobado,
                q: req.query.q,
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
    app.post<{ Body: PostGastosBody }>(
        "/gastos",
        {
            schema: {
                summary: "Crear gasto",
                body: {
                    type: "object",
                    required: ["eventId", "importe"],
                    properties: {
                        eventId: {type: "string"},
                        importe: {type: "string", pattern: "^-?\\d+(\\.\\d+)?$"},
                        descripcion: {type: "string"},
                        proveedor: {type: "string"},
                        comprobado: {type: "boolean"},
                    },
                    additionalProperties: false,
                },
                response: {200: itemEnvelope, 400: errorEnvelope},
                tags: ["gastos"],
            },
        },
        async (req, reply) => {
            try {
                const created = await repo.insertOne({
                    eventId: req.body.eventId,
                    importe: req.body.importe,
                    descripcion: req.body.descripcion ?? null,
                    proveedor: req.body.proveedor ?? null,
                    comprobado: req.body.comprobado ?? false
                });
                return reply.send({ok: true as const, data: created});
            } catch (error) {
                app.log.error({err: error, route: "POST /gastos", requestId: (req as unknown as { id: string }).id});
                return reply.status(400).send({
                    ok: false as const,
                    code: "CREATE_FAILED",
                    message: "No se pudo crear el gasto"
                });
            }
        }
    );

    // PUT
    app.put<{ Params: { id: string }; Body: PutGastosBody }>(
        "/gastos/:id",
        {
            schema: {
                summary: "Actualizar gasto por id",
                params: {
                    type: "object",
                    properties: {id: {type: "string"}},
                    required: ["id"],
                    additionalProperties: false
                },
                body: {
                    type: "object",
                    properties: {
                        importe: {type: "string", pattern: "^-?\\d+(\\.\\d+)?$"},
                        descripcion: {type: "string"},
                        proveedor: {type: "string"},
                        comprobado: {type: "boolean"},
                    },
                    additionalProperties: false,
                    minProperties: 1,
                },
                response: {200: itemEnvelope, 404: errorEnvelope},
                tags: ["gastos"],
            },
        },
        async (req, reply) => {
            const updated = await repo.updateById(req.params.id, req.body);
            if (!updated) {
                return reply.status(404).send({ok: false as const, code: "NOT_FOUND", message: "Gasto no encontrado"});
            }
            return reply.send({ok: true as const, data: updated});
        }
    );

    // DELETE
    app.delete<{ Params: { id: string } }>(
        "/gastos/:id",
        {
            schema: {
                summary: "Eliminar gasto por id",
                params: {
                    type: "object",
                    properties: {id: {type: "string"}},
                    required: ["id"],
                    additionalProperties: false
                },
                response: {200: boolEnvelope, 404: errorEnvelope},
                tags: ["gastos"]
            }
        },
        async (req, reply) => {
            const deleted = await repo.deleteById(req.params.id);
            if (!deleted) return reply.status(404).send({
                ok: false as const,
                code: "NOT_FOUND",
                message: "Gasto no encontrado"
            });
            return reply.send({ok: true as const, data: {deleted: true}});
        }
    );
}
