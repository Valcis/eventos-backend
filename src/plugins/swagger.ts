import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (app, opts: { title: string; version: string; description?: string }) => {
  await app.register(swagger, {
    openapi: {
      info: { title: opts.title, version: opts.version, description: opts.description ?? '' }
    }
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true }
  });
});
