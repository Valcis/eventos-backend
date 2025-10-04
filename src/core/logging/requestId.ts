import fp from 'fastify-plugin';

export default fp(async (app) => {
  app.addHook('onRequest', async (req) => {
    req.log = req.log.child({ reqId: req.id });
  });
});
