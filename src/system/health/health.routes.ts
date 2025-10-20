import type { FastifyPluginCallback } from 'fastify';
import { HealthResponse } from './health.schemas';

const TAG = 'Sistema';

export const healthRoutes: FastifyPluginCallback = (app, _opts, done) => {
	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Health check',
				description: 'Devuelve el estado básico del servicio',
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
