export type SortDir = 'asc' | 'desc';

/**
 * Todos los campos posibles de ordenación across todas las colecciones
 * Cada colección tiene un subset de estos campos disponibles
 */
export type SortBy =
	| 'createdAt'
	| 'updatedAt'
	| 'name'
	| 'date'
	| 'stock'
	| 'priority'
	| 'startDate'
	| 'endDate'
	| 'totalAmount'
	| 'netPrice';

export type Sort = {
	sortBy: SortBy;
	sortDir: SortDir;
};
