import fp from 'fastify-plugin';

export default fp(async (app) => {
  app.get('/', {
    schema: {
      summary: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: { ok: { type: 'boolean' }, ts: { type: 'string' } }
        }
      }
    }
  }, async (_req, _reply) => {
    return { ok: true, ts: new Date().toISOString() };
  });
});
