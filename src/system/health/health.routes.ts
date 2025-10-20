import type { FastifyPluginCallback } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { registry } from '../../infra/openapi/registry';
import { HealthResponse } from './health.schemas';

const TAG = 'Sistema';

// ---- OpenAPI (zod-to-openapi) ----
registry.registerPath({
	method: 'get',
	path: '/health',
	tags: [TAG],
	summary: 'Health check',
	description: 'Devuelve el estado básico del servicio.',
	responses: {
		200: {
			description: 'Servicio saludable',
			content: {
				'application/json': {
					schema: HealthResponse,
				},
			},
		},
	},
});

// ---- Fastify routes ----
export const healthRoutes: FastifyPluginCallback = (app, _opts, done) => {
	const typed = app.withTypeProvider<ZodTypeProvider>();

	typed.get(
		'/health',
		{
			schema: {
				tags: [TAG],
				response: {
					200: HealthResponse,
				},
			},
		},
		async (_req, reply) => {
			const payload = {
				status: 'ok' as const,
				uptime: Math.floor(process.uptime()),
				timestamp: new Date().toISOString(),
			};
			return reply.code(200).send(payload);
		},
	);

	done();
};
