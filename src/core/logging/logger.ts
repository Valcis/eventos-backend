import { join } from 'node:path';
import type { FastifyServerOptions } from 'fastify';
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL ?? 'info';

export function buildLoggerOptions(): FastifyServerOptions['logger'] {
	const baseOptions = {
		level: logLevel,
		// Redactar datos sensibles
		redact: {
			paths: [
				'req.headers.authorization',
				'req.headers.cookie',
				'*.password',
				'*.token',
				'*.passwordHash',
				'req.body.password',
				'req.body.currentPassword',
				'req.body.newPassword',
			],
			censor: '[REDACTED]',
		},
		// Serializers personalizados
		serializers: {
			req: (req: unknown) => {
				const r = req as {
					method?: string;
					url?: string;
					hostname?: string;
					ip?: string;
					headers?: Record<string, unknown>;
					body?: unknown;
					query?: unknown;
					params?: unknown;
				};
				return {
					method: r.method ?? 'UNKNOWN',
					url: r.url ?? 'UNKNOWN',
					hostname: r.hostname ?? 'UNKNOWN',
					ip: r.ip ?? 'UNKNOWN',
					userAgent: (r.headers as Record<string, string>)?.['user-agent'] ?? 'UNKNOWN',
					body: r.body,
					query: r.query,
					params: r.params,
				};
			},
			res: (res: unknown) => {
				const r = res as {
					statusCode?: number;
					headers?: Record<string, unknown>;
				};
				return {
					statusCode: r.statusCode ?? 0,
					headers: r.headers,
				};
			},
			err: pino.stdSerializers.err,
		},
	};

	// En desarrollo: usar pino-pretty via transport
	if (isDev) {
		return {
			...baseOptions,
			transport: {
				targets: [
					{
						target: 'pino-pretty',
						level: logLevel,
						options: {
							colorize: true,
							translateTime: 'HH:MM:ss',
							// Ignorar campos verbose para consola limpia (los archivos sí los reciben)
						ignore:
							'pid,hostname,err,errorType,errorCode,errorMessage,query,headers,ip,userId,hasValidation,validationErrors,responseStatusCode,responseCode,responseMessage,req,res,userAgent,userEmail,responseTime',
						},
					},
					{
						target: 'pino-roll',
						level: 'info',
						options: {
							file: join(process.cwd(), 'logs', 'app'),
							frequency: 'daily',
							size: '10m',
							mkdir: true,
						},
					},
					{
						target: 'pino-roll',
						level: 'error',
						options: {
							file: join(process.cwd(), 'logs', 'error'),
							frequency: 'daily',
							size: '10m',
							mkdir: true,
						},
					},
				],
			},
		};
	}

	// En producción: solo archivos con pino-roll
	return {
		...baseOptions,
		transport: {
			targets: [
				{
					target: 'pino-roll',
					level: 'info',
					options: {
						file: join(process.cwd(), 'logs', 'app'),
						frequency: 'daily',
						size: '10m',
						mkdir: true,
					},
				},
				{
					target: 'pino-roll',
					level: 'error',
					options: {
						file: join(process.cwd(), 'logs', 'error'),
						frequency: 'daily',
						size: '10m',
						mkdir: true,
					},
				},
			],
		},
	};
}
