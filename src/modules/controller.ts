import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Db, Document, Filter, WithId } from 'mongodb';
import { makeCrud } from '../infra/mongo/crud';
import type { PaginationQuery } from '../shared/types/pagination';
import type { SortBy, SortDir } from '../shared/types/sort';
import { parsePaginationParams, extractFilters } from '../shared/lib/pagination';

export function makeController<
    TDomain,
    TCreate = unknown,
    TUpdate = TCreate,
    TQuery extends Filter<Document> = Filter<Document>,
>(
    collection: string,
    mapIn: (d: TCreate | TUpdate | Partial<TUpdate>) => Document,
    mapOut: (d: WithId<Document>) => TDomain,
    options?: {
        softDelete?: boolean;
        defaultSortBy?: SortBy;
        defaultSortDir?: SortDir;
    },
) {
    const repo = makeCrud<TDomain, TCreate, TUpdate, TQuery>({
        collection,
        toDb: mapIn,
        fromDb: mapOut,
        softDelete: options?.softDelete ?? true,
        defaultSortBy: options?.defaultSortBy ?? 'createdAt',
        defaultSortDir: options?.defaultSortDir ?? 'desc',
    });

    return {
        list: async (
            req: FastifyRequest<{ Querystring: TQuery & PaginationQuery }>,
            reply: FastifyReply,
        ) => {
            type QInput = Omit<TQuery, 'limit' | 'after' | 'sortBy' | 'sortDir'> & PaginationQuery;
            const db = (req.server as unknown as { db: Db }).db;
            const query = req.query as unknown as QInput;

            // Parsear paginación y sort con defaults del controller
            const page = parsePaginationParams(query, {
                sortBy: options?.defaultSortBy,
                sortDir: options?.defaultSortDir,
            });

            // Extraer filtros (sin params de paginación/sort)
            const filters = extractFilters<TQuery>(query);

            // Pasar todo a list
            const result = await repo.list(db, filters as TQuery, {
                limit: page.limit,
                after: page.after,
                sortBy: page.sortBy,
                sortDir: page.sortDir,
            });

            return reply.send(result);
        },

        get: async (req: FastifyRequest, reply: FastifyReply) => {
            const db = (req.server as unknown as { db: Db }).db;
            const { id } = req.params as { id: string };
            const found = await repo.getById(db, id);
            if (!found)
                return reply.code(404).send({ code: 'NOT_FOUND', message: 'No encontrado' });
            return reply.send(found);
        },

        create: async (req: FastifyRequest, reply: FastifyReply) => {
            const db = (req.server as unknown as { db: Db }).db;
            const created = await repo.create(db, req.body as TCreate);
            return reply.code(201).send(created);
        },

        replace: async (req: FastifyRequest, reply: FastifyReply) => {
            const db = (req.server as unknown as { db: Db }).db;
            const { id } = req.params as { id: string };
            const updated = await repo.update(db, id, req.body as TUpdate);
            return reply.send(updated);
        },

        patch: async (req: FastifyRequest, reply: FastifyReply) => {
            const db = (req.server as unknown as { db: Db }).db;
            const { id } = req.params as { id: string };
            const updated = await repo.patch(db, id, req.body as Partial<TUpdate>);
            return reply.send(updated);
        },

        remove: async (req: FastifyRequest, reply: FastifyReply) => {
            const db = (req.server as unknown as { db: Db }).db;
            const { id } = req.params as { id: string };
            await repo.softDelete(db, id);
            return reply.code(204).send();
        },

        removeHard: async (req: FastifyRequest, reply: FastifyReply) => {
            const db = (req.server as unknown as { db: Db }).db;
            const { id } = req.params as { id: string };
            await repo.removeHard(db, id);
            return reply.code(204).send();
        },
    };
}