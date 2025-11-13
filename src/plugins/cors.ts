import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env';

export default fp(async function corsPlugin(app: FastifyInstance) {
	const env = getEnv();

	// Configuración de CORS basada en el entorno
	const corsOrigin = env.CORS_ORIGINS
		? env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
		: env.NODE_ENV === 'production'
			? false // En producción sin CORS_ORIGINS, bloquear todo
			: true; // En desarrollo, permitir todo

	await app.register(cors, {
		origin: corsOrigin,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	});

	app.log.info(
		{
			corsOrigin: typeof corsOrigin === 'boolean' ? corsOrigin : corsOrigin.length + ' origins',
		},
		'CORS configurado',
	);
});
