import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';

// Augment: añadimos requestId con tipo fuerte
declare module 'fastify' {
	interface FastifyRequest {
		requestId: string;
	}
}

function firstHeaderValue(v: string | string[] | undefined): string | undefined {
	if (typeof v === 'string') return v;
	if (Array.isArray(v)) return v[0];
	return undefined; // controla undefined
}

const requestIdPlugin: FastifyPluginAsync = async (app) => {
	app.addHook('onRequest', async (req, reply) => {
		const fromHeader = firstHeaderValue(req.headers['x-request-id']);
		const rid: string =
			fromHeader && fromHeader.length > 0
				? fromHeader
				: (randomUUID?.() ?? Math.random().toString(36).slice(2));

		req.requestId = rid;
		reply.header('x-request-id', rid);
	});
};

export default fp(requestIdPlugin, { name: 'requestId' });
