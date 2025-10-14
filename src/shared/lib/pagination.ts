import type { PaginationQuery, Page } from '../types/pagination';

/**
 * Parsea los parámetros de paginación cursor-based desde el query string
 * @param query - Query string con limit y after opcionales
 * @returns Objeto Page con limit normalizado y after normalizado (string | null)
 */
export function parsePaginationParams(query: PaginationQuery): Page {
	const rawLimit = typeof query.limit === 'string' ? Number(query.limit) : (query.limit ?? 15);

	const limit = Math.min(50, Math.max(5, Number.isFinite(rawLimit) ? rawLimit : 15));

	// Clave: normalizamos a `null` cuando no hay after válido (nunca undefined)
	const after = typeof query.after === 'string' ? query.after : null;

	return { limit, after };
}

/**
 * Extrae filtros del query string eliminando parámetros de paginación
 * @param query - Query completo incluyendo paginación
 * @returns Objeto con solo los filtros de búsqueda (tipado, sin `any`)
 */
export function extractFilters<T extends Record<string, unknown>>(
	query: Omit<T, 'limit' | 'after'> & PaginationQuery,
): Omit<T, 'limit' | 'after'> {
	const {
		limit: _l,
		after: _a,
		...rest
	} = query as Record<string, unknown> & {
		limit?: unknown;
		after?: unknown;
	};
	// Devolvemos exactamente “T sin limit/after”
	return rest as Omit<T, 'limit' | 'after'>;
}
