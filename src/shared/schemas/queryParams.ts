import { z } from 'zod';

/**
 * Enum de direcciones de ordenación
 */
export const SortDir = z.enum(['asc', 'desc']).default('desc');

/**
 * Campos de ordenación por tipo de colección
 */
export const EventSortBy = z.enum(['createdAt', 'updatedAt', 'name', 'date']).default('createdAt');
export const ProductSortBy = z.enum(['createdAt', 'updatedAt', 'name', 'stock']).default('createdAt');
export const PromotionSortBy = z
	.enum(['createdAt', 'updatedAt', 'name', 'priority', 'startDate', 'endDate'])
	.default('createdAt');
export const ReservationSortBy = z
	.enum(['createdAt', 'updatedAt', 'totalAmount'])
	.default('createdAt');
export const ExpenseSortBy = z.enum(['createdAt', 'updatedAt', 'netPrice']).default('createdAt');
export const CatalogSortBy = z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt');

/**
 * Schema base de paginación (común a todos los endpoints)
 */
export const BasePaginationParams = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(5)
		.max(50)
		.optional()
		.describe('Número de resultados por página (5-50). Default: 15'),
	after: z
		.string()
		.optional()
		.describe(
			'Cursor para paginación (ID del último elemento de la página anterior). Omitir para primera página.',
		),
});

/**
 * Schema base de ordenación
 */
export function createSortParams<T extends z.ZodType>(sortByEnum: T) {
	return z.object({
		sortBy: sortByEnum.describe(
			'Campo por el cual ordenar los resultados. Default: createdAt (más reciente primero)',
		),
		sortDir: SortDir.describe(
			'Dirección de ordenación: "asc" (ascendente) o "desc" (descendente). Default: desc',
		),
	});
}

/**
 * Factory para crear schema de query params completo
 * @param sortByEnum - Enum de campos de ordenación específicos de la colección
 * @param additionalFilters - Schema con filtros adicionales específicos
 * @returns Schema completo con paginación, ordenación y filtros
 */
export function createQueryParams<T extends z.ZodType, F extends z.ZodRawShape>(
	sortByEnum: T,
	additionalFilters?: z.ZodObject<F>,
) {
	const base = BasePaginationParams.merge(createSortParams(sortByEnum));

	if (additionalFilters) {
		return base.merge(additionalFilters);
	}

	return base;
}

/**
 * Filtros comunes para colecciones con eventId
 */
export const EventIdFilter = z.object({
	eventId: z.string().optional().describe('Filtrar por ID de evento'),
});

/**
 * Filtros comunes para búsqueda por nombre
 */
export const NameFilter = z.object({
	name: z.string().optional().describe('Filtrar por nombre (búsqueda parcial, case-insensitive)'),
});

/**
 * Filtros comunes: eventId + name
 */
export const CommonCatalogFilters = EventIdFilter.merge(NameFilter);
