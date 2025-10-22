import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './errors';

/**
 * Interface for structured error response
 */
interface ErrorResponse {
	statusCode: number;
	code: string;
	error: string;
	message: string;
	details?: unknown;
	stack?: string;
}

/**
 * Get human-readable error name from status code
 */
function getErrorName(statusCode: number): string {
	switch (statusCode) {
		case 400:
			return 'Bad Request';
		case 401:
			return 'Unauthorized';
		case 403:
			return 'Forbidden';
		case 404:
			return 'Not Found';
		case 409:
			return 'Conflict';
		case 500:
			return 'Internal Server Error';
		default:
			return 'Error';
	}
}

/**
 * Handle AppError instances
 */
function handleAppError(err: AppError): ErrorResponse {
	return {
		statusCode: err.statusCode,
		code: err.code,
		error: getErrorName(err.statusCode),
		message: err.message,
	};
}

/**
 * Handle Zod validation errors
 */
function handleZodError(err: ZodError): ErrorResponse {
	return {
		statusCode: 400,
		code: 'VALIDATION_ERROR',
		error: 'Bad Request',
		message: 'Error de validación en los datos enviados',
		details: err.errors.map((e) => ({
			path: e.path.join('.'),
			message: e.message,
			code: e.code,
		})),
	};
}

/**
 * Handle MongoDB duplicate key errors (code 11000)
 */
function handleMongoDBDuplicateError(): ErrorResponse {
	return {
		statusCode: 409,
		code: 'DUPLICATE_ENTRY',
		error: 'Conflict',
		message:
			'Ya existe un registro con los mismos datos únicos. Por favor verifica que no estés duplicando información (nombre, fecha, etc.).',
	};
}

/**
 * Handle Fastify validation errors
 */
function handleFastifyValidationError(err: FastifyError): ErrorResponse {
	const validation = err as FastifyError & {
		validation?: Array<{ instancePath?: string; message?: string }>;
	};

	let message = err.message || 'Error de validación';

	if (validation.validation && validation.validation.length > 0) {
		const first = validation.validation[0];
		if (first) {
			const field =
				first.instancePath?.replace(/^\//, '').replace(/\//g, '.') || 'campo desconocido';
			message = `Error de validación en "${field}": ${first.message || 'formato inválido'}. Revisa el formato esperado en la documentación.`;
		}
	}

	return {
		statusCode: 400,
		code: 'FST_ERR_VALIDATION',
		error: 'Bad Request',
		message,
	};
}

/**
 * Handle generic Fastify errors and unknown errors
 */
function handleGenericError(
	err: Error & { code?: string | number; statusCode?: number },
): ErrorResponse {
	const statusCode = err.statusCode ?? 500;

	return {
		statusCode,
		code: (typeof err.code === 'string' ? err.code : undefined) ?? 'INTERNAL_ERROR',
		error: getErrorName(statusCode),
		message: err.message || 'Error interno del servidor',
	};
}

/**
 * Check if error is a MongoDB duplicate key error
 */
function isMongoDBDuplicateError(err: unknown): boolean {
	const error = err as { code?: number | string };
	return error.code === 11000 || error.code === '11000';
}

/**
 * Main error handler for Fastify
 * Centralized error handling logic that categorizes and formats errors
 */
export function errorHandler(
	err: Error,
	req: FastifyRequest,
	reply: FastifyReply,
	includeStack = false,
): void {
	// Log the error
	req.log.error({ err, url: req.url, method: req.method }, 'Request error');

	let response: ErrorResponse;

	// Handle different error types
	if (err instanceof AppError) {
		response = handleAppError(err);
	} else if (err instanceof ZodError) {
		response = handleZodError(err);
	} else if (isMongoDBDuplicateError(err)) {
		response = handleMongoDBDuplicateError();
	} else if ((err as FastifyError).code === 'FST_ERR_VALIDATION') {
		response = handleFastifyValidationError(err as FastifyError);
	} else {
		response = handleGenericError(
			err as Error & { code?: string | number; statusCode?: number },
		);
	}

	// Include stack trace in development
	if (includeStack && err.stack) {
		response.stack = err.stack;
	}

	reply.code(response.statusCode).send(response);
}

/**
 * Create a configured error handler with environment-specific settings
 */
export function createErrorHandler(isDevelopment: boolean) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function (this: any, err: any, req: any, reply: any): void {
		errorHandler(err as Error, req as FastifyRequest, reply as FastifyReply, isDevelopment);
	};
}
