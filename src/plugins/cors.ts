import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env';

export default fp(async function corsPlugin(app: FastifyInstance) {
	const env = getEnv();

	// Configuración de CORS basada en el entorno
	if (env.CORS_ORIGINS) {
		// Si hay CORS_ORIGINS definido, usar esos orígenes específicos
		const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());

		await app.register(cors, {
			origin: allowedOrigins,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
			exposedHeaders: ['Content-Length', 'X-Request-Id'],
			maxAge: 600,
		});

		app.log.info({ corsOrigins: allowedOrigins }, 'CORS configurado con orígenes específicos');
	} else if (env.NODE_ENV === 'production') {
		// En producción sin CORS_ORIGINS, bloquear todo
		await app.register(cors, {
			origin: false,
			credentials: true,
		});

		app.log.warn('CORS bloqueado en producción (sin CORS_ORIGINS)');
	} else {
		// En desarrollo, permitir todos los orígenes
		await app.register(cors, {
			origin: true,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
			exposedHeaders: ['Content-Length', 'X-Request-Id'],
			maxAge: 600,
		});

		app.log.info('CORS configurado para desarrollo (todos los orígenes permitidos)');
	}
});
