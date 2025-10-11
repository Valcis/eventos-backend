import type {FastifyRequest, FastifyReply} from 'fastify';
import {getDb} from '../infra/mongo/client';
import {makeCrud} from '../repositories/crud';

export function makeController(repo = makeCrud<any>({
    collection: 'cashiers',
    toDb: (d) => d,
    fromDb: (d) => ({id: String(d._id), ...d}),
    softDelete: true
})) {
    return {
        list: async (request: FastifyRequest, reply: FastifyReply) => {
            const db = await getDb();
            const {limit, after} = (request as any).page;
            const filter: any = {...(request as any).query};
            delete filter.limit;
            delete filter.after;
            const result = await repo.list(db, filter, after, limit);
            reply.send(result);
        },
        get: async (request: FastifyRequest, reply: FastifyReply) => {
            const db = await getDb();
            const found = await repo.get(db, (request as any).params.id);
            if (!found) return reply.code(404).send({code: 'NOT_FOUND', message: 'No encontrado'});
            reply.send(found);
        },
        create: async (request: FastifyRequest, reply: FastifyReply) => {
            const db = await getDb();
            const created = await repo.create(db, (request as any).body);
            reply.code(201).send(created);
        },
        put: async (request: FastifyRequest, reply: FastifyReply) => {
            const db = await getDb();
            const updated = await repo.replace(db, (request as any).params.id, (request as any).body);
            reply.send(updated);
        },
        patch: async (request: FastifyRequest, reply: FastifyReply) => {
            const db = await getDb();
            const updated = await repo.patch(db, (request as any).params.id, (request as any).body);
            reply.send(updated);
        },
        remove: async (request: FastifyRequest, reply: FastifyReply) => {
            const db = await getDb();
            await repo.softDelete(db, (request as any).params.id);
            reply.code(204).send();
        },
    };
}
