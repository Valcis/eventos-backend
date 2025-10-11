import type { FastifyRequest, FastifyReply } from 'fastify';
import type { HookHandlerDoneFunction } from 'fastify/types/hooks';
import type { PaginationQuery, Page } from '../types/pagination';

declare module 'fastify' {
	interface FastifyRequest {
		page?: Page;
	}
}

export function parsePagination(
	request: FastifyRequest<{ Querystring: PaginationQuery }>,
	_reply: FastifyReply,
	done: HookHandlerDoneFunction,
): void {
	const q = request.query ?? {};
	const raw = typeof q.limit === 'string' ? Number(q.limit) : (q.limit ?? 15);
	const limit = Math.min(50, Math.max(5, Number.isFinite(raw) ? Number(raw) : 15));
	const after = typeof q.after === 'string' ? q.after : undefined;
	request.page = { limit, after };
	done();
}
