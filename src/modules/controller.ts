import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Db, Document, WithId } from 'mongodb';
import { makeCrud } from '../infra/mongo/crud';
import type { PaginationQuery } from '../shared/types/pagination';
import { parsePaginationParams, extractFilters } from '../shared/lib/pagination';

export function makeController<T extends Document>(
	collection: string,
	mapIn: (d: any) => Document,
	mapOut: (d: WithId<Document>) => T,
	options?: { softDelete?: boolean; defaultSort?: Record<string, 1 | -1> },
) {
	const repo = makeCrud<T>({
		collection,
		toDb: mapIn,
		fromDb: mapOut,
		softDelete: options?.softDelete ?? true,
		defaultSort: options?.defaultSort ?? { _id: 1 },
	});
	return {
		list: async (
			req: FastifyRequest<{ Querystring: PaginationQuery }>,
			reply: FastifyReply,
		) => {
			const db = (req.server as any).db as Db;
			const page = parsePaginationParams(req.query);
			const filters = extractFilters(req.query as Record<string, any>);
			const result = await repo.list(db, filters, page);
			return reply.send(result);
		},
		get: async (req: FastifyRequest, reply: FastifyReply) => {
			const db = (req.server as any).db as Db;
			const { id } = req.params as any;
			const found = await repo.getById(db, id);
			if (!found)
				return reply.code(404).send({ code: 'NOT_FOUND', message: 'No encontrado' });
			return reply.send(found);
		},
		create: async (req: FastifyRequest, reply: FastifyReply) => {
			const db = (req.server as any).db as Db;
			const created = await repo.create(db, req.body as any);
			return reply.code(201).send(created);
		},
		replace: async (req: FastifyRequest, reply: FastifyReply) => {
			const db = (req.server as any).db as Db;
			const { id } = req.params as any;
			const updated = await repo.update(db, id, req.body as any);
			return reply.send(updated);
		},
		patch: async (req: FastifyRequest, reply: FastifyReply) => {
			const db = (req.server as any).db as Db;
			const { id } = req.params as any;
			const updated = await repo.patch(db, id, req.body as any);
			return reply.send(updated);
		},
		remove: async (req: FastifyRequest, reply: FastifyReply) => {
			const db = (req.server as any).db as Db;
			const { id } = req.params as any;
			await repo.softDelete(db, id);
			return reply.code(204).send();
		},
		// DELETE /:id/hard — borrado duro explícito
		removeHard: async (req: FastifyRequest, reply: FastifyReply) => {
			const db = (req.server as any).db as Db;
			const { id } = (req.params as any) ?? {};
			await repo.removeHard(db, id);
			return reply.code(204).send();
		},
	};
}
