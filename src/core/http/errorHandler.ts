import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
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
function handleMongoDBDuplicateError(err: unknown): ErrorResponse {
	const mongoError = err as {
		code?: number;
		keyPattern?: Record<string, number>;
		keyValue?: Record<string, unknown>;
	};

	// Extraer el campo que causó el duplicado
	let field: string | undefined;
	let value: unknown;

	if (mongoError.keyPattern) {
		const fields = Object.keys(mongoError.keyPattern);
		// Si hay múltiples campos, usar el primero que no sea eventId
		field = fields.find((f) => f !== 'eventId' && f !== 'isActive') || fields[0];
		if (field && mongoError.keyValue) {
			value = mongoError.keyValue[field];
		}
	}

	const fieldMessage = field ? ` (campo: ${field})` : '';
	const valueMessage = value ? `: "${value}"` : '';

	return {
		statusCode: 409,
		code: 'DUPLICATE_ENTRY',
		error: 'Conflict',
		message: `Ya existe un registro con ese valor${fieldMessage}${valueMessage}. Por favor usa un valor diferente.`,
		details: field
			? {
					field,
					value,
				}
			: undefined,
	};
}

/**
 * Handle Invalid ObjectId errors
 */
function handleInvalidObjectIdError(err: Error): ErrorResponse {
	return {
		statusCode: 400,
		code: 'INVALID_ID',
		error: 'Bad Request',
		message:
			'El ID proporcionado no es válido. Debe ser un ObjectId de MongoDB válido (24 caracteres hexadecimales).',
		details: {
			providedId: err.message.replace('Invalid ObjectId: ', ''),
		},
	};
}

/**
 * Handle JWT errors
 */
function handleJWTError(err: Error): ErrorResponse {
	if (err instanceof jwt.TokenExpiredError) {
		return {
			statusCode: 401,
			code: 'TOKEN_EXPIRED',
			error: 'Unauthorized',
			message: 'Token expirado',
		};
	}

	if (err instanceof jwt.JsonWebTokenError) {
		return {
			statusCode: 401,
			code: 'INVALID_TOKEN',
			error: 'Unauthorized',
			message: 'Token inválido',
		};
	}

	if (err instanceof jwt.NotBeforeError) {
		return {
			statusCode: 401,
			code: 'TOKEN_NOT_ACTIVE',
			error: 'Unauthorized',
			message: 'Token no activo aún',
		};
	}

	// Fallback genérico
	return {
		statusCode: 401,
		code: 'UNAUTHORIZED',
		error: 'Unauthorized',
		message: 'Error de autenticación',
	};
}

/**
 * Handle Fastify validation errors
 */
function handleFastifyValidationError(err: FastifyError): ErrorResponse {
	const validation = err as FastifyError & {
		validation?: Array<{
			instancePath?: string;
			message?: string;
			path?: string;
			code?: string;
		}>;
	};

	// Si tenemos detalles de validación, devolverlos estructurados
	if (validation.validation && validation.validation.length > 0) {
		return {
			statusCode: 400,
			code: 'VALIDATION_ERROR',
			error: 'Bad Request',
			message: 'Error de validación en los datos enviados',
			details: validation.validation.map((e: any) => ({
				path: e.params?.path || e.path || e.instancePath?.replace(/^\//, '').replace(/\//g, '.') || 'unknown',
				message: e.message || 'Error de validación',
				code: e.params?.code || e.code,
			})),
		};
	}

	// Fallback si no hay detalles
	return {
		statusCode: 400,
		code: 'VALIDATION_ERROR',
		error: 'Bad Request',
		message: err.message || 'Error de validación',
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
 * Check if error is a JWT-related error
 */
function isJWTError(err: unknown): boolean {
	return (
		err instanceof jwt.TokenExpiredError ||
		err instanceof jwt.JsonWebTokenError ||
		err instanceof jwt.NotBeforeError
	);
}

/**
 * Check if error is an Invalid ObjectId error
 */
function isInvalidObjectIdError(err: unknown): boolean {
	const error = err as Error;
	return (
		error.message?.includes('Invalid ObjectId') ||
		error.message?.includes(
			'Argument passed in must be a string of 12 bytes or a string of 24 hex characters',
		)
	);
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
	// Log the error with details
	const errCode = (err as FastifyError).code;
	const errValidation = (err as FastifyError).validation;

	req.log.error(
		{
			err,
			url: req.url,
			method: req.method,
			errorCode: errCode,
			errorName: err.name,
			hasValidation: !!errValidation,
			isZodError: err instanceof ZodError,
		},
		'Request error',
	);

	let response: ErrorResponse;

	// Handle different error types
	// Revisar si el error tiene un cause que sea ZodError
	const zodCause = (err as any).cause;
	if (zodCause && zodCause instanceof ZodError) {
		response = handleZodError(zodCause);
	} else if (err instanceof AppError) {
		response = handleAppError(err);
	} else if (err instanceof ZodError) {
		response = handleZodError(err);
	} else if (isJWTError(err)) {
		response = handleJWTError(err);
	} else if (isInvalidObjectIdError(err)) {
		response = handleInvalidObjectIdError(err);
	} else if (isMongoDBDuplicateError(err)) {
		response = handleMongoDBDuplicateError(err);
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
