import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export default fp(
	async (app) => {
		// NOTA: validatorCompiler y serializerCompiler se registran en app.ts
		// para asegurar que siempre estén activos, incluso si Swagger está deshabilitado

		// Registrar Swagger
		await app.register(swagger, {
			openapi: {
				info: {
					title: 'EVENTOS API',
					version: '3.0.0',
					description: 'API de gestión de eventos',
				},
				servers: [{ url: 'http://localhost:3000', description: 'Desarrollo' }],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: 'http',
							scheme: 'bearer',
							bearerFormat: 'JWT',
						},
					},
				},
			},
			transform: jsonSchemaTransform,
		});

		// UI
		await app.register(swaggerUI, {
			routePrefix: '/swagger',
			staticCSP: false,
			uiConfig: {
				docExpansion: 'list',
				deepLinking: true,
				filter: true,
				displayRequestDuration: true,
				tryItOutEnabled: true,
				persistAuthorization: true,
				defaultModelsExpandDepth: -1,
				syntaxHighlight: { theme: 'monokai' },
			},
		});
	},
	{ name: 'openapi-plugin' },
);
