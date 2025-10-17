export function buildLoggerOptions() {
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
			req: (req) => ({
				method: req.method,
				url: req.url,
				hostname: req.hostname,
				remoteAddress: req.ip,
				remotePort: req.socket?.remotePort,
			}),
		},
	};
}
