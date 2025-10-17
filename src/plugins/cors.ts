import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export default fp(async function corsPlugin(app: FastifyInstance) {
	await app.register(cors, {
		origin: true, //  TODO:mejorar :> env.CORS_ORIGINS?.split(',') || false,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	});
});
