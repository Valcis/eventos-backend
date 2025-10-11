import type {FastifyRequest, FastifyReply} from 'fastify';
import type {HookHandlerDoneFunction} from 'fastify/types/hooks';

declare module 'fastify' {
    interface FastifyRequest {
        page?: { limit: number; after?: string }
    }
}

export function parsePagination(request: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction) {
    const q: any = (request as any).query || {};
    const rawLimit = Number(q.limit ?? 15);
    const limit = Math.min(50, Math.max(5, isFinite(rawLimit) ? rawLimit : 15));
    const after = typeof q.after === 'string' ? q.after : undefined;
    request.page = {limit, after};
    done();
}
