// src/core/errors/AppError.ts
export class AppError extends Error {
	constructor(
		public statusCode: number,
		public code: string,
		message: string,
	) {
		super(message);
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(404, 'NOT_FOUND', `${resource} not found`);
	}
}

export class ValidationError extends AppError {
	constructor(message: string) {
		super(400, 'VALIDATION_ERROR', message);
	}
}
