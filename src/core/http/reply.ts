import type { FastifyReply } from 'fastify';

export function ok<T>(reply: FastifyReply, data: T, meta?: Record<string, unknown>) {
	return reply.code(200).send({ data, ...(meta ? { meta } : {}) });
}

export function created<T>(reply: FastifyReply, data: T, meta?: Record<string, unknown>) {
	// data = objeto COMPLETO creado (R4)
	return reply.code(201).send({ data, ...(meta ? { meta } : {}) });
}

export function noContent(reply: FastifyReply) {
	return reply.code(204).send();
}
