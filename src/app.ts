import Fastify, { FastifyError } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { buildLoggerOptions } from './core/logging/logger';
import corsPlugin from './plugins/cors';
import { healthRoutes } from './system/health/health.routes';
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
import { getEnv } from './config/env';
import { ensureMongoArtifacts } from './infra/mongo/artifacts';
import { connectMongo } from './infra/mongo/client';
import requestId from './core/logging/requestId';
import bearerAuth from './plugins/bearer';
import { AppError } from './core/http/errors';
import { ZodError } from 'zod';
import openApiPlugin from './plugins/openapi';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const env = getEnv();

export async function buildApp() {
	const db = await connectMongo(); //cambido a singleton
	const app = Fastify({
		logger: buildLoggerOptions(),
		disableRequestLogging: true,
		requestTimeout: 15000,
	}).withTypeProvider<ZodTypeProvider>();

	app.decorate('db', db);

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
	await app.register(rateLimit, { max: 100, timeWindow: '1 minute', allowList: ['127.0.0.1'] });

	await app.register(openApiPlugin);
	await app.register(healthRoutes, { prefix: '/health' });
	await app.register(bearerAuth, { exemptPaths: ['/health', '/swagger'] });

	const base = env.BASE_PATH.endsWith('/') ? env.BASE_PATH.slice(0, -1) : env.BASE_PATH;

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

	app.setErrorHandler((err, req, reply) => {
		// Log del error siempre
		req.log.error({ err, url: req.url, method: req.method }, 'Request error');

		// Error de aplicación personalizado
		if (err instanceof AppError) {
			const statusCode = err.statusCode;
			const errorName = statusCode === 404 ? 'Not Found' :
			                  statusCode === 400 ? 'Bad Request' :
			                  statusCode === 401 ? 'Unauthorized' :
			                  statusCode === 403 ? 'Forbidden' :
			                  statusCode === 409 ? 'Conflict' :
			                  'Internal Server Error';

			return reply.code(statusCode).send({
				statusCode,
				code: err.code,
				error: errorName,
				message: err.message,
			});
		}

		// Error de validación Zod
		if (err instanceof ZodError) {
			return reply.code(400).send({
				statusCode: 400,
				code: 'VALIDATION_ERROR',
				error: 'Bad Request',
				message: 'Error de validación en los datos enviados',
				details: err.errors.map((e) => ({
					path: e.path,
					message: e.message,
				})),
			});
		}

		// Error de duplicado de MongoDB (código 11000)
		if (err.code === 11000 || err.code === '11000') {
			return reply.code(409).send({
				statusCode: 409,
				code: 'DUPLICATE_ENTRY',
				error: 'Conflict',
				message: 'Ya existe un registro con los mismos datos únicos. Por favor verifica que no estés duplicando información (nombre, fecha, etc.).',
			});
		}

		// Errores de Fastify y otros
		const status = (err as FastifyError).statusCode || 500;
		const errorName = status === 404 ? 'Not Found' :
		                  status === 400 ? 'Bad Request' :
		                  status === 401 ? 'Unauthorized' :
		                  status === 403 ? 'Forbidden' :
		                  status === 500 ? 'Internal Server Error' :
		                  'Error';

		// Mensaje más descriptivo para errores de validación de Fastify
		let message = err.message || 'Error interno del servidor';
		if ((err as FastifyError).code === 'FST_ERR_VALIDATION') {
			const validation = err as FastifyError & { validation?: Array<{ instancePath?: string; message?: string }> };
			if (validation.validation && validation.validation.length > 0) {
				const first = validation.validation[0];
				const field = first.instancePath?.replace(/^\//, '').replace(/\//g, '.') || 'campo desconocido';
				message = `Error de validación en "${field}": ${first.message || 'formato inválido'}. Revisa el formato esperado en la documentación.`;
			}
		}

		reply.code(status).send({
			statusCode: status,
			code: (err as FastifyError).code || 'INTERNAL_ERROR',
			error: errorName,
			message,
			...(env.NODE_ENV !== 'production' && { stack: err.stack }),
		});
	});

	app.ready((e) => {
		if (e) app.log.error(e);
	});

	return app;
}
