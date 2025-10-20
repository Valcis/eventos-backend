import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import {
	serializerCompiler,
	validatorCompiler,
	jsonSchemaTransform,
} from 'fastify-type-provider-zod';

export default fp(
	async (app) => {
		// Configurar validadores Zod
		app.setValidatorCompiler(validatorCompiler);
		app.setSerializerCompiler(serializerCompiler);

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
			transform: jsonSchemaTransform, // Zod → OpenAPI
		});

		// UI
		await app.register(swaggerUI, {
			routePrefix: '/swagger',
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
