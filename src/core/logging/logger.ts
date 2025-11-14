import { join } from 'node:path';
import type { FastifyServerOptions } from 'fastify';

export function buildLoggerOptions(): FastifyServerOptions['logger'] {
	const isDev = process.env.NODE_ENV !== 'production';

	return {
		level: process.env.LOG_LEVEL ?? 'info',
		redact: {
			paths: [
				'req.headers.authorization',
				'req.headers.cookie',
				'*.password',
				'*.token',
				'req.body.password',
			],
			censor: '[REDACTED]',
		},
		serializers: {
			req: (req: unknown) => {
				const r = req as {
					method?: string;
					url?: string;
					hostname?: string;
					ip?: string;
					socket?: { remotePort?: number };
				};
				return {
					method: r.method ?? 'UNKNOWN',
					url: r.url ?? 'UNKNOWN',
					hostname: r.hostname ?? 'UNKNOWN',
					remoteAddress: r.ip ?? 'UNKNOWN',
					remotePort: r.socket?.remotePort ?? 0,
				};
			},
		},
		// Transport para escribir en archivo Y consola
		transport: {
			targets: [
				// Consola con pretty print en desarrollo
				...(isDev
					? [
							{
								target: 'pino-pretty',
								level: 'info',
								options: {
									colorize: true,
									translateTime: 'HH:MM:ss',
									ignore: 'pid,hostname',
								},
							},
						]
					: [
							{
								target: 'pino/file',
								level: 'info',
								options: { destination: 1 }, // stdout
							},
						]),
				// Archivo siempre (desarrollo y producción) con rotación diaria
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
				// Archivo de errores con rotación diaria
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
