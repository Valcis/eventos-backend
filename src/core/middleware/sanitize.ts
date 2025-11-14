import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

/**
 * Lista de operadores MongoDB que deben ser bloqueados en query params
 * para prevenir operator injection attacks
 */
const MONGODB_OPERATORS = [
	'$where',
	'$regex',
	'$ne',
	'$gt',
	'$gte',
	'$lt',
	'$lte',
	'$in',
	'$nin',
	'$exists',
	'$type',
	'$mod',
	'$text',
	'$expr',
	'$jsonSchema',
	'$all',
	'$elemMatch',
	'$size',
	'$bitsAllClear',
	'$bitsAllSet',
	'$bitsAnyClear',
	'$bitsAnySet',
];

/**
 * Verifica si un objeto contiene operadores MongoDB peligrosos
 */
function containsDangerousOperators(obj: unknown): boolean {
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}

	const keys = Object.keys(obj);

	// Verificar si alguna key es un operador MongoDB
	for (const key of keys) {
		if (MONGODB_OPERATORS.includes(key)) {
			return true;
		}

		// Recursivamente verificar valores que sean objetos
		const value = (obj as Record<string, unknown>)[key];
		if (typeof value === 'object' && value !== null) {
			if (containsDangerousOperators(value)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Sanitiza query params removiendo operadores MongoDB peligrosos
 */
export function sanitizeQueryParams(
	req: FastifyRequest,
	_reply: FastifyReply,
	done: HookHandlerDoneFunction,
): void {
	const query = req.query as Record<string, unknown>;

	if (containsDangerousOperators(query)) {
		req.log.warn(
			{ query, url: req.url, ip: req.ip },
			'Intento de MongoDB operator injection bloqueado',
		);

		// Limpiar los operadores peligrosos
		const sanitized: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(query)) {
			// Solo incluir keys que no sean operadores
			if (!MONGODB_OPERATORS.includes(key)) {
				// Si el valor es un objeto, también sanitizarlo
				if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
					const sanitizedValue: Record<string, unknown> = {};
					for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
						if (!MONGODB_OPERATORS.includes(subKey)) {
							sanitizedValue[subKey] = subValue;
						}
					}
					sanitized[key] = sanitizedValue;
				} else {
					sanitized[key] = value;
				}
			}
		}

		// Reemplazar query con la versión sanitizada
		req.query = sanitized;
	}

	done();
}
