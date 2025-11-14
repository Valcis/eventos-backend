import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { buildLoggerOptions } from './core/logging/logger';
import corsPlugin from './plugins/cors';
import { healthRoutes } from './system/healthCheck';
import eventsRoutes from './modules/events/routes';
import reservationsRoutes from './modules/reservations/routes';
import productsRoutes from './modules/catalogs/products/routes';
import promotionsRoutes from './modules/catalogs/promotions/routes';
import expensesRoutes from './modules/expenses/routes';
import salespeopleRoutes from './modules/catalogs/salespeople/routes';
import paymentMethodsRoutes from './modules/catalogs/payment-methods/routes';
import cashiersRoutes from './modules/catalogs/cashiers/routes';
import storesRoutes from './modules/catalogs/stores/routes';
import unitsRoutes from './modules/catalogs/units/routes';
import consumptionTypesRoutes from './modules/catalogs/consumption-types/routes';
import payersRoutes from './modules/catalogs/payers/routes';
import pickupPointsRoutes from './modules/catalogs/pickup-points/routes';
import partnersRoutes from './modules/catalogs/partners/routes';
import usersRoutes from './modules/users/routes';
import authRoutes from './modules/auth/routes';
import { getEnv } from './config/env';
import { ensureMongoArtifacts } from './infra/mongo/artifacts';
import { connectMongo } from './infra/mongo/client';
import requestId from './core/logging/requestId';
import bearerAuth from './plugins/bearer';
import auth0Plugin from './plugins/auth0';
import openApiPlugin from './plugins/openapi';
import { createErrorHandler } from './core/http/errorHandler';
import { sanitizeQueryParams } from './core/middleware/sanitize';
import { ZodTypeProvider, validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod';
import type { ZodSchema } from 'zod';

const env = getEnv();

export async function buildApp() {
	const db = await connectMongo(); //cambido a singleton
	const loggerOptions = buildLoggerOptions();
	const app = Fastify({
		logger: loggerOptions ?? true,
		disableRequestLogging: true,
		requestTimeout: 15000,
	}).withTypeProvider<ZodTypeProvider>();

	app.decorate('db', db);

	// CRÍTICO: Registrar validador de Zod SIEMPRE (no solo si Swagger está habilitado)
	app.setValidatorCompiler(validatorCompiler);

	// Usar serializerCompiler custom que NO valida errores automáticos de Fastify
	// Solo serializa con Zod, sin validar estrictamente en runtime
	// Esto permite que los schemas se conviertan para Swagger pero evita FST_ERR_FAILED_ERROR_SERIALIZATION
	app.setSerializerCompiler(({ schema }) => {
		return (data) => {
			// Si el dato parece un error de Fastify (tiene statusCode/error), no validar con Zod
			// Los errores automáticos no coinciden con nuestros schemas de respuesta
			if (
				data &&
				typeof data === 'object' &&
				('statusCode' in data || 'error' in data || 'code' in data)
			) {
				// Es un error, devolver sin validar contra schema
				return JSON.stringify(data);
			}

			// Para respuestas exitosas, intentar validar con Zod
			try {
				const zodSchema = schema as ZodSchema;
				return JSON.stringify(zodSchema.parse(data));
			} catch (err) {
				// Si falla la validación, loguear y devolver sin validar
				app.log.warn(
					{ schema: schema.constructor.name, error: err },
					'SerializerCompiler: Failed to validate response with schema',
				);
				return JSON.stringify(data);
			}
		};
	});

	if (env.MONGO_BOOT === '1') {
		try {
			await ensureMongoArtifacts(db);
			app.log.info('Mongo artifacts ensured ✔');
		} catch (err) {
			app.log.error({ err }, 'Mongo artifacts failed');
			throw err;
		}
	}

	await app.register(requestId);
	await app.register(corsPlugin);

	// Sanitizar query params para prevenir operator injection
	app.addHook('preHandler', sanitizeQueryParams);

	await app.register(rateLimit, {
		max: env.RATE_LIMIT_MAX,
		timeWindow: env.RATE_LIMIT_WINDOW,
		allowList: ['127.0.0.1', '::1', 'localhost'],
	});

	const base = env.BASE_PATH.endsWith('/') ? env.BASE_PATH.slice(0, -1) : env.BASE_PATH;

	if (env.SWAGGER_ENABLED) {
		await app.register(openApiPlugin);
	}
	await app.register(healthRoutes, { prefix: '/health' });

	// Registrar autenticación según configuración
	// Si AUTH0 está habilitado, usar Auth0; si no, usar Bearer JWT local
	const exemptPaths = ['/health', '/swagger', base + '/auth/register', base + '/auth/login'];

	if (env.AUTH0_ENABLED) {
		await app.register(auth0Plugin, { exemptPaths });
	} else if (env.AUTH_ENABLED) {
		await app.register(bearerAuth, { exemptPaths });
	}

	await app.register(authRoutes, { prefix: base + '/auth' });
	await app.register(usersRoutes, { prefix: base + '/users' });
	await app.register(eventsRoutes, { prefix: base + '/events' });
	await app.register(reservationsRoutes, { prefix: base + '/reservations' });
	await app.register(productsRoutes, { prefix: base + '/products' });
	await app.register(promotionsRoutes, { prefix: base + '/promotions' });
	await app.register(expensesRoutes, { prefix: base + '/expenses' });
	await app.register(salespeopleRoutes, { prefix: base + '/salespeople' });
	await app.register(paymentMethodsRoutes, { prefix: base + '/payment-methods' });
	await app.register(cashiersRoutes, { prefix: base + '/cashiers' });
	await app.register(storesRoutes, { prefix: base + '/stores' });
	await app.register(unitsRoutes, { prefix: base + '/units' });
	await app.register(consumptionTypesRoutes, { prefix: base + '/consumption-types' });
	await app.register(payersRoutes, { prefix: base + '/payers' });
	await app.register(pickupPointsRoutes, { prefix: base + '/pickup-points' });
	await app.register(partnersRoutes, { prefix: base + '/partners' });

	app.addHook('onResponse', async (req, reply) => {
		req.log.info(
			{
				statusCode: reply.statusCode,
				method: req.method,
				url: req.url,
				responseTime: reply.elapsedTime,
			},
			'request completed',
		);
	});

	app.addHook('onRoute', (r) => {
		app.log.info(
			{ method: r.method, url: r.url, routePrefix: (r as { prefix?: string }).prefix },
			'ROUTE_ADDED',
		);
	});

	app.setNotFoundHandler((req, reply) => {
		req.log.warn({ url: req.url, method: req.method }, 'route not found');
		reply.code(404).send({ ok: false, error: 'Not Found' });
	});

	// Centralized error handler
	app.setErrorHandler(createErrorHandler(env.NODE_ENV !== 'production'));

	app.ready((e) => {
		if (e) app.log.error(e);
	});

	return app;
}
