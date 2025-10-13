import type { PaginationQuery, Page } from '../types/pagination';

/**
 * Parsea los parámetros de paginación cursor-based desde el query string
 * @param query - Query string con limit y after opcionales
 * @returns Objeto Page con limit normalizado y after si existe
 */
export function parsePaginationParams(query: PaginationQuery): Page {
	const rawLimit = typeof query.limit === 'string' ? Number(query.limit) : (query.limit ?? 15);
	const limit = Math.min(50, Math.max(5, Number.isFinite(rawLimit) ? rawLimit : 15));
	const after = typeof query.after === 'string' ? query.after : undefined;
	return { limit, after };
}

/**
 * Extrae filtros del query string eliminando parámetros de paginación
 * @param query - Query completo incluyendo paginación
 * @returns Objeto con solo los filtros de búsqueda
 */
export function extractFilters(query: Record<string, any>): Record<string, any> {
	const filters: Record<string, any> = {};
	for (const [key, value] of Object.entries(query)) {
		if (key !== 'limit' && key !== 'after') {
			filters[key] = value;
		}
	}
	return filters;
}
