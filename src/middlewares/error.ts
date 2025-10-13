import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function registerErrorHandler(fastify: FastifyInstance) {
	fastify.setErrorHandler((err, _request: FastifyRequest, reply: FastifyReply) => {
		const status = (err as any).status ?? 500;
		const payload = {
			code:
				(err as any).code ??
				(status === 409 ? 'CONFLICT' : status === 404 ? 'NOT_FOUND' : 'UNPROCESSABLE'),
			message: (err as any).message ?? 'Error inesperado',
			details: (err as any).details ?? undefined,
		} as const;
		reply.code(status).send(payload);
	});
}
