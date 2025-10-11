import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export default fp(async function requestId(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    const rid = req.headers['x-request-id'] ?? Math.random().toString(36).slice(2);
    (req as any).requestId = rid;
    reply.header('x-request-id', String(rid));
  });
});
