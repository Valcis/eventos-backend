import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import YAML from 'yaml';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';

export default fp(async function swaggerPlugin(app: FastifyInstance) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const yamlPath = path.resolve(__dirname, '../../openapi/openapi.yaml');
	const spec = YAML.parse(fs.readFileSync(yamlPath, 'utf-8'));

	await app.register(fastifySwagger, {
		mode: 'static',
		specification: { path: yamlPath, baseDir: path.dirname(yamlPath) },
	});

	await app.register(fastifySwaggerUI, {
		routePrefix: '/docs',
		staticCSP: true,
		uiConfig: { docExpansion: 'list', deepLinking: true },
	});

	app.log.info({ path: '/docs' }, 'Swagger UI mounted');
});
