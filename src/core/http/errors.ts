/**
 * Base error class for application errors
 */
export class AppError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly statusCode: number,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * 404 Not Found error
 */
export class NotFoundError extends AppError {
	constructor(resource: string, id?: string) {
		const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
		super('NOT_FOUND', message, 404);
	}
}

/**
 * 400 Bad Request - Generic validation error
 */
export class BadRequestError extends AppError {
	constructor(message: string) {
		super('BAD_REQUEST', message, 400);
	}
}

/**
 * 409 Conflict - Duplicate entry or constraint violation
 */
export class ConflictError extends AppError {
	constructor(message: string) {
		super('CONFLICT', message, 409);
	}
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
	constructor(message = 'Authentication required') {
		super('UNAUTHORIZED', message, 401);
	}
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends AppError {
	constructor(message = 'Insufficient permissions') {
		super('FORBIDDEN', message, 403);
	}
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
	constructor(
		message = 'Internal server error',
		public readonly originalError?: Error,
	) {
		super('INTERNAL_SERVER_ERROR', message, 500);
	}
}
