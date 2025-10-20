import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';

const TAG = 'Sistema';

const HealthResponse = z.object({
	status: z.literal('ok').describe('Estado del servicio'),
	uptime: z.number().int().nonnegative().describe('Tiempo de actividad en segundos'),
	timestamp: z.string().datetime().describe('Marca de tiempo de la respuesta'),
});

export const healthRoutes: FastifyPluginCallback = (app, _opts, done) => {
	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Health check',
				description: 'Devuelve el estado básico del servicio',
				// Response schema deshabilitado - sin serializerCompiler causa errores
				// response: {
				// 	200: HealthResponse,
				// },
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
