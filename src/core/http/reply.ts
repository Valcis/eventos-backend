import type { FastifyReply } from 'fastify';

export function ok<T>(reply: FastifyReply, data: T, meta?: Record<string, unknown>) {
  return reply.code(200).send({ data, meta });
}

export function created<T>(reply: FastifyReply, data: T) {
  return reply.code(201).send({ data });
}

export function noContent(reply: FastifyReply) {
  return reply.code(204).send();
}
