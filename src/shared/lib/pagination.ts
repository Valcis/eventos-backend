import type { PaginationQuery, Page } from '../types/pagination';
import type { SortBy, SortDir } from '../types/sort';

/**
 * Parsea los parámetros de paginación cursor-based desde el query string
 * @param query - Query string con limit, after, sortBy y sortDir opcionales
 * @returns Objeto Page con valores normalizados
 */
export function parsePaginationParams(
    query: PaginationQuery,
    defaults: { sortBy?: SortBy; sortDir?: SortDir } = {}
): Page {
    const rawLimit = typeof query.limit === 'string' ? Number(query.limit) : (query.limit ?? 15);
    const limit = Math.min(50, Math.max(5, Number.isFinite(rawLimit) ? rawLimit : 15));

    // Normalizar after: solo string válido o null
    const after = typeof query.after === 'string' && query.after !== '' ? query.after : null;

    // Normalizar sortBy
    const sortBy: SortBy =
        typeof query.sortBy === 'string' && isValidSortBy(query.sortBy)
            ? (query.sortBy as SortBy)
            : (defaults.sortBy ?? 'createdAt');

    // Normalizar sortDir
    const sortDir: SortDir =
        query.sortDir === 'asc' || query.sortDir === 'desc'
            ? query.sortDir
            : (defaults.sortDir ?? 'desc');

    return { limit, after, sortBy, sortDir };
}

/**
 * Valida si un string es un SortBy válido
 */
function isValidSortBy(value: string): boolean {
    const validValues: SortBy[] = ['createdAt', 'updatedAt', 'amount'];
    return validValues.includes(value as SortBy);
}

/**
 * Extrae filtros del query string eliminando parámetros de paginación y sort
 * @param query - Query completo incluyendo paginación
 * @returns Objeto con solo los filtros de búsqueda
 */
export function extractFilters<T extends Record<string, unknown>>(
    query: Omit<T, 'limit' | 'after' | 'sortBy' | 'sortDir'> & PaginationQuery,
): Omit<T, 'limit' | 'after' | 'sortBy' | 'sortDir'> {
    const {
        limit: _limit,
        after: _after,
        sortBy: _sortBy,
        sortDir: _sortDir,
        ...rest
    } = query as Record<string, unknown> & {
        limit?: unknown;
        after?: unknown;
        sortBy?: unknown;
        sortDir?: unknown;
    };

    // Marcar como usados
    void _limit;
    void _after;
    void _sortBy;
    void _sortDir;

    return rest as Omit<T, 'limit' | 'after' | 'sortBy' | 'sortDir'>;
}