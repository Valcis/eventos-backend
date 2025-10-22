import { z } from 'zod';

/**
 * Schema de error genérico
 * Usado en respuestas 4xx y 5xx
 */
export const ErrorResponse = z.object({
	statusCode: z.number().int().describe('Código HTTP de estado. Ejemplo: 400, 404, 500'),
	code: z.string().describe('Código de error interno. Ejemplo: "VALIDATION_ERROR", "NOT_FOUND", "INTERNAL_ERROR"'),
	error: z.string().describe('Nombre del error HTTP. Ejemplo: "Bad Request", "Not Found", "Internal Server Error"'),
	message: z.string().describe('Mensaje descriptivo del error. Ejemplo: "El evento con ID 507f1f77bcf86cd799439011 no fue encontrado"'),
	details: z.array(z.object({
		path: z.array(z.union([z.string(), z.number()])).describe('Ruta del campo con error. Ejemplo: ["body", "name"]'),
		message: z.string().describe('Mensaje de validación. Ejemplo: "El nombre es requerido"'),
	})).optional().describe('Detalles de errores de validación (solo en errores 400)'),
});

/**
 * Schema de error de validación (400)
 * Usado cuando los datos enviados no cumplen el schema Zod
 */
export const ValidationErrorResponse = z.object({
	statusCode: z.literal(400).describe('Código HTTP 400'),
	code: z.literal('VALIDATION_ERROR').describe('Código interno de error de validación'),
	error: z.literal('Bad Request').describe('Error HTTP'),
	message: z.string().describe('Mensaje general. Ejemplo: "Error de validación en los datos enviados"'),
	details: z.array(z.object({
		path: z.array(z.union([z.string(), z.number()])).describe('Ruta del campo. Ejemplo: ["name"]'),
		message: z.string().describe('Mensaje específico. Ejemplo: "Expected string, received number"'),
	})).describe('Lista de errores de validación por campo'),
});

/**
 * Schema de recurso no encontrado (404)
 * Usado cuando un recurso solicitado por ID no existe
 */
export const NotFoundResponse = z.object({
	statusCode: z.literal(404).describe('Código HTTP 404'),
	code: z.literal('NOT_FOUND').describe('Código interno de recurso no encontrado'),
	error: z.literal('Not Found').describe('Error HTTP'),
	message: z.string().describe('Mensaje descriptivo. Ejemplo: "No encontrado"'),
});

/**
 * Schema de error de autenticación (401)
 * Usado cuando falta o es inválido el token de autenticación
 */
export const UnauthorizedResponse = z.object({
	statusCode: z.literal(401).describe('Código HTTP 401'),
	code: z.literal('UNAUTHORIZED').describe('Código interno de error de autenticación'),
	error: z.literal('Unauthorized').describe('Error HTTP'),
	message: z.string().describe('Mensaje descriptivo. Ejemplo: "Token de autenticación inválido o expirado"'),
});

/**
 * Schema de error de autorización (403)
 * Usado cuando el usuario autenticado no tiene permisos
 */
export const ForbiddenResponse = z.object({
	statusCode: z.literal(403).describe('Código HTTP 403'),
	code: z.literal('FORBIDDEN').describe('Código interno de error de autorización'),
	error: z.literal('Forbidden').describe('Error HTTP'),
	message: z.string().describe('Mensaje descriptivo. Ejemplo: "No tienes permisos para realizar esta acción"'),
});

/**
 * Schema de conflicto (409)
 * Usado cuando hay conflictos de datos (ej. duplicados)
 */
export const ConflictResponse = z.object({
	statusCode: z.literal(409).describe('Código HTTP 409'),
	code: z.literal('CONFLICT').describe('Código interno de conflicto'),
	error: z.literal('Conflict').describe('Error HTTP'),
	message: z.string().describe('Mensaje descriptivo. Ejemplo: "Ya existe un evento con ese nombre en esa fecha"'),
});

/**
 * Schema de error interno del servidor (500)
 * Usado cuando ocurre un error inesperado
 */
export const InternalErrorResponse = z.object({
	statusCode: z.literal(500).describe('Código HTTP 500'),
	code: z.literal('INTERNAL_ERROR').describe('Código interno de error del servidor'),
	error: z.literal('Internal Server Error').describe('Error HTTP'),
	message: z.string().describe('Mensaje descriptivo. Ejemplo: "Ocurrió un error inesperado. Por favor contacte al soporte."'),
});

/**
 * Schema de metadatos de paginación
 * Usado en respuestas paginadas con cursor
 */
export const PageMeta = z.object({
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.describe('Número de elementos por página solicitados. Ejemplo: 15'),
	nextCursor: z
		.string()
		.nullable()
		.describe(
			'Cursor para la siguiente página (ID del último elemento). null si no hay más páginas. Ejemplo: "507f1f77bcf86cd799439011"',
		),
	total: z
		.number()
		.int()
		.nonnegative()
		.describe('Total de elementos que cumplen los filtros (sin paginación). Ejemplo: 42'),
});

/**
 * Factory function para crear schemas de respuesta paginada
 * @param itemSchema - Schema Zod del tipo de elemento
 * @param description - Descripción del tipo de elemento
 * @returns Schema de respuesta paginada
 */
export function createPagedResponse<T extends z.ZodTypeAny>(
	itemSchema: T,
	description: string,
) {
	return z.object({
		items: z.array(itemSchema).describe(`Array de ${description}`),
		page: PageMeta.describe('Metadatos de paginación'),
	});
}

/**
 * Schema de respuesta vacía (204)
 * Usado en operaciones DELETE exitosas
 */
export const NoContentResponse = z.void().describe('Sin contenido (operación exitosa sin cuerpo de respuesta)');

/**
 * Schema de respuesta de creación exitosa (201)
 * El cuerpo contiene el recurso creado
 */
export function createCreatedResponse<T extends z.ZodTypeAny>(
	itemSchema: T,
	description: string,
) {
	return itemSchema.describe(`${description} creado exitosamente con ID generado y timestamps`);
}
