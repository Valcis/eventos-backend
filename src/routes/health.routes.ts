import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/live', async () => ({ ok: true }));
  app.get('/ready', async () => ({ ok: true }));
}
