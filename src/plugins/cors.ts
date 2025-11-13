import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env';

export default fp(async function corsPlugin(app: FastifyInstance) {
	const env = getEnv();

	// Configuración de CORS basada en el entorno
	let corsOrigin: boolean | string | string[] | RegExp;

	if (env.CORS_ORIGINS) {
		// Si hay CORS_ORIGINS definido, usar esos orígenes
		corsOrigin = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
	} else if (env.NODE_ENV === 'production') {
		// En producción sin CORS_ORIGINS, bloquear todo
		corsOrigin = false;
	} else {
		// En desarrollo, permitir localhost y 127.0.0.1 en cualquier puerto
		corsOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?$/;
	}

	await app.register(cors, {
		origin: corsOrigin,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	});

	app.log.info(
		{
			corsOrigin:
				typeof corsOrigin === 'boolean'
					? corsOrigin
					: corsOrigin instanceof RegExp
						? 'localhost/127.0.0.1 (dev)'
						: Array.isArray(corsOrigin)
							? corsOrigin.join(', ')
							: corsOrigin,
		},
		'CORS configurado',
	);
});
