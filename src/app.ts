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
import swaggerModule from './system/swagger/swagger.routes';
import { AppError } from './core/http/errors';

const env = getEnv();

export async function buildApp() {
	//const client = new MongoClient(env.MONGO_URL);
	//await client.connect();
	const db = await connectMongo(); //cambido a singleton

	const app = Fastify({
		logger: buildLoggerOptions(),
		disableRequestLogging: true,
		requestTimeout: 15000,
	});

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

	await app.register(swaggerModule, { prefix: '/swagger' });
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

	app.setErrorHandler((err, _req, reply) => {
		if (err instanceof AppError) {
			return reply.code(err.statusCode).send({
				code: err.code,
				message: err.message,
			});
		}
		const status = (err as FastifyError).statusCode || 500;
		const payload =
			env.NODE_ENV === 'production'
				? { ok: false, error: err.message }
				: { ok: false, error: err.message, stack: err.stack };
		reply.code(status).send(payload);
	});

	app.ready((e) => {
		if (e) app.log.error(e);
	});

	return app;
}
