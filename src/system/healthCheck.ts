import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import type { Db } from 'mongodb';

const TAG = 'Sistema';

const HealthResponse = z.object({
	status: z.enum(['ok', 'degraded']).describe('Estado del servicio'),
	uptime: z.number().int().nonnegative().describe('Tiempo de actividad en segundos'),
	timestamp: z.string().datetime().describe('Marca de tiempo de la respuesta'),
});

const ReadyResponse = z.object({
	status: z.enum(['ready', 'not_ready']).describe('Estado de disponibilidad'),
	checks: z
		.object({
			database: z
				.object({
					status: z.enum(['ok', 'error']),
					message: z.string().optional(),
				})
				.describe('Estado de la base de datos'),
		})
		.describe('Resultados de los health checks'),
	timestamp: z.string().datetime().describe('Marca de tiempo de la respuesta'),
});

export const healthRoutes: FastifyPluginCallback = (app, _opts, done) => {
	// Health check básico (sin verificar dependencias)
	app.get(
		'/',
		{
			schema: {
				tags: [TAG],
				summary: 'Health check básico',
				description:
					'Devuelve el estado básico del servicio sin verificar dependencias externas',
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

	// Readiness check (verifica dependencias)
	app.get(
		'/ready',
		{
			schema: {
				tags: [TAG],
				summary: 'Readiness check',
				description: 'Verifica que el servicio esté listo para recibir tráfico (incluye MongoDB)',
				response: {
					200: ReadyResponse,
					503: ReadyResponse,
				},
			},
		},
		async (req, reply) => {
			const checks: {
				database: {
					status: 'ok' | 'error';
					message?: string;
				};
			} = {
				database: { status: 'ok' },
			};

			let isReady = true;

			// Verificar conexión a MongoDB
			try {
				const db = (req.server as unknown as { db: Db }).db;
				await db.admin().ping();
				checks.database.status = 'ok';
			} catch (err) {
				checks.database.status = 'error';
				checks.database.message = err instanceof Error ? err.message : 'Unknown error';
				isReady = false;
				req.log.error({ err }, 'MongoDB health check failed');
			}

			const payload = {
				status: isReady ? ('ready' as const) : ('not_ready' as const),
				checks,
				timestamp: new Date().toISOString(),
			};

			return reply.code(isReady ? 200 : 503).send(payload);
		},
	);

	done();
};
