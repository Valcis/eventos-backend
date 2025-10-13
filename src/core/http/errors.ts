export class AppError extends Error {
	code: string;
	statusCode: number;
	meta?: Record<string, unknown>;

	constructor(
		message: string,
		code = 'APP_ERROR',
		statusCode = 400,
		meta?: Record<string, unknown>,
	) {
		super(message);
		this.code = code;
		this.statusCode = statusCode;
		this.meta = meta;
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Not found', meta?: Record<string, unknown>) {
		super(message, 'NOT_FOUND', 404, meta);
	}
}

export class NotImplementedError extends AppError {
	constructor(message = 'Not implemented', meta?: Record<string, unknown>) {
		super(message, 'NOT_IMPLEMENTED', 501, meta);
	}
}
