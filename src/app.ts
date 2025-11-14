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
import { ZodError, type ZodSchema } from 'zod';

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

	// CRÍTICO: Registrar validador de Zod que LANCE errores
	// Esto asegura que los errores pasen por errorHandler
	app.setValidatorCompiler(({ schema }) => {
		return (data) => {
			console.error('=== VALIDATOR CALLED ===');
			console.error('Data:', JSON.stringify(data, null, 2));

			try {
				const zodSchema = schema as ZodSchema;
				console.error('=== VALIDATOR: Parsing with Zod ===');
				const result = zodSchema.parse(data);
				console.error('=== VALIDATOR: Parse successful ===');
				return { value: result };
			} catch (error) {
				console.error('=== VALIDATOR: Parse failed ===');
				console.error('Error type:', error?.constructor?.name);
				console.error('Is ZodError:', error instanceof ZodError);

				// Si es ZodError, LANZARLO para que llegue a errorHandler
				if (error instanceof ZodError) {
					console.error('=== VALIDATOR THROWING ZodError ===');
					console.error('ZodError issues:', JSON.stringify(error.issues, null, 2));
					// Lanzar el error directamente - Fastify lo capturará y llamará errorHandler
					throw error;
				}
				// Si es otro tipo de error, lanzarlo
				console.error('=== VALIDATOR: Throwing non-Zod error ===');
				throw error;
			}
		};
	});

	// Serializer custom: NO serializar errores, solo respuestas exitosas
	// Evita error 500 cuando hay errores de validación
	app.setSerializerCompiler(({ schema }) => {
		const zodSchema = schema as ZodSchema;
		return (data) => {
			// DEBUG: Log EVERYTHING that comes through serializer
			console.error('=== SERIALIZER CALLED ===');
			console.error('Data type:', typeof data);
			console.error('Data:', JSON.stringify(data, null, 2));
			console.error(
				'Data keys:',
				data && typeof data === 'object' ? Object.keys(data) : 'N/A',
			);

			// NO serializar errores - dejar que Fastify los maneje
			// Los errores tienen statusCode >= 400
			if (data && typeof data === 'object' && 'statusCode' in data) {
				const statusCode = (data as { statusCode: number }).statusCode;
				console.error('=== SERIALIZER: Detected error response, statusCode:', statusCode);
				if (statusCode >= 400) {
					// Es un error, NO validar con Zod
					const result = JSON.stringify(data);
					console.error('=== SERIALIZER: Returning error JSON:', result);
					return result;
				}
			}

			// Para respuestas exitosas, validar con Zod
			try {
				const result = JSON.stringify(zodSchema.parse(data));
				console.error('=== SERIALIZER: Returning success JSON (length):', result.length);
				return result;
			} catch (err) {
				// Si falla la validación, loguear el error y devolver sin validar
				console.error('=== SERIALIZER: Zod validation failed, returning raw ===');
				console.error('Error:', err instanceof Error ? err.message : String(err));
				// Devolver sin validar para no romper la respuesta
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

	// Hook onError: Intercepta TODOS los errores, incluyendo los de validación
	// Este hook se ejecuta ANTES del errorHandler, permitiéndonos formatear correctamente
	app.addHook('onError', async (req, reply, error) => {
		console.error('=== onError HOOK CALLED ===');
		console.error('Error type:', error?.constructor?.name);
		console.error('Is ZodError:', error instanceof ZodError);

		// Si es un ZodError lanzado por el validator
		if (error instanceof ZodError) {
			console.error('=== INTERCEPTING ZodError in onError ===');
			console.error('ZodError issues:', JSON.stringify(error.issues, null, 2));

			// Formatear respuesta de error con mensajes personalizados
			const errorResponse = {
				statusCode: 400,
				code: 'VALIDATION_ERROR',
				error: 'Bad Request',
				message: 'Error de validación en los datos enviados',
				details: error.issues.map((issue) => ({
					path: issue.path.join('.'),
					message: issue.message,
					code: issue.code,
				})),
			};

			console.error('=== Sending formatted error response ===');
			console.error('Response:', JSON.stringify(errorResponse, null, 2));

			// Enviar respuesta y prevenir que Fastify maneje el error
			reply.code(400).send(errorResponse);
		}
	});

	// Sanitizar query params para prevenir operator injection
	app.addHook('preHandler', sanitizeQueryParams);

	// Hook onSend: ÚLTIMO hook antes de enviar respuesta al cliente
	// Aquí interceptamos respuestas vacías de errores de validación
	app.addHook('onSend', async (req, reply, payload) => {
		console.error('=== onSend CALLED ===');
		console.error('StatusCode:', reply.statusCode);
		console.error('Payload type:', typeof payload);
		console.error('Payload length:', typeof payload === 'string' ? payload.length : 'N/A');
		console.error('Payload:', payload);

		// Si es un error 400 (validación) y el payload está vacío o es "{}"
		if (reply.statusCode === 400) {
			const payloadStr = typeof payload === 'string' ? payload : String(payload);

			console.error('=== Detected 400 error ===');
			console.error('Payload string:', payloadStr);
			console.error('Is empty or {}:', payloadStr === '{}' || payloadStr.trim() === '');

			// Si el payload está vacío o es un objeto vacío
			if (payloadStr === '{}' || payloadStr.trim() === '' || payloadStr === 'null') {
				console.error('=== FIXING EMPTY VALIDATION ERROR RESPONSE ===');

				// Crear respuesta de error formateada
				const errorResponse = {
					statusCode: 400,
					code: 'VALIDATION_ERROR',
					error: 'Bad Request',
					message: 'Error de validación en los datos enviados',
					details: [],
				};

				const fixedPayload = JSON.stringify(errorResponse);
				console.error('=== Fixed payload:', fixedPayload);
				return fixedPayload;
			}
		}

		return payload;
	});

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

	// Hook para loguear el INICIO de cada request (útil para debugging y correlación)
	app.addHook('onRequest', async (req) => {
		req.log.info(
			{
				method: req.method,
				url: req.url,
				query: req.query,
				userAgent: req.headers['user-agent'],
				ip: req.ip,
				userId: req.user?.userId, // Si está autenticado
			},
			'request started',
		);
	});

	// Hook para loguear el FIN de cada request (con métricas de respuesta)
	app.addHook('onResponse', async (req, reply) => {
		const logData = {
			statusCode: reply.statusCode,
			method: req.method,
			url: req.url,
			responseTime: reply.elapsedTime,
			userId: req.user?.userId,
			userEmail: req.user?.email,
		};

		// Loguear como error si statusCode >= 400, info si es exitoso
		if (reply.statusCode >= 400) {
			req.log.error(logData, 'request completed with error');
		} else {
			req.log.info(logData, 'request completed');
		}
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
	console.log('=== CONFIGURING ERROR HANDLER ===');
	app.setErrorHandler(createErrorHandler(env.NODE_ENV !== 'production'));
	console.log('=== ERROR HANDLER CONFIGURED ===');

	app.ready((e) => {
		if (e) app.log.error(e);
	});

	return app;
}
