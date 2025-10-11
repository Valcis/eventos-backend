import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env';

export default fp(async function bearerPlugin(app: FastifyInstance) {
  const env = getEnv();
  app.addHook('preHandler', async (req, reply) => {
    if (!env.AUTH_ENABLED) return;
    const auth = req.headers['authorization'];
    if (!auth || !auth.toString().startsWith('Bearer ')) {
      return reply.code(401).send({ code: 'FORBIDDEN', message: 'Falta token Bearer' });
    }
  });
});
