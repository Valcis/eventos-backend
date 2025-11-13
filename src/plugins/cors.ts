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
		});

		app.log.info({ corsOrigins: allowedOrigins }, 'CORS configurado con orígenes específicos');
	} else if (env.NODE_ENV === 'production') {
		// En producción sin CORS_ORIGINS, bloquear todo
		await app.register(cors, {
			origin: false,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		});

		app.log.warn('CORS bloqueado en producción (sin CORS_ORIGINS)');
	} else {
		// En desarrollo, usar función callback para aceptar localhost y 127.0.0.1
		await app.register(cors, {
			origin: (origin, callback) => {
				// Si no hay origen (same-origin) o coincide con localhost/127.0.0.1
				if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?$/.test(origin)) {
					callback(null, true);
				} else {
					callback(null, false);
				}
			},
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		});

		app.log.info('CORS configurado para desarrollo (localhost/127.0.0.1)');
	}
});
