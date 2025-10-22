import type { SortBy, SortDir, Sort } from '../types/sort';

export function parseSortParams<T extends { sortBy?: unknown; sortDir?: unknown }>(
	query: T,
	defaults: Sort = { sortBy: 'createdAt', sortDir: 'desc' },
): Sort {
	const sortBy = typeof query.sortBy === 'string' ? (query.sortBy as SortBy) : defaults.sortBy;
	const sortDir =
		query.sortDir === 'asc' || query.sortDir === 'desc' ? query.sortDir : defaults.sortDir;
	return { sortBy, sortDir };
}

/** Devuelve sort de Mongo, con _id como tie-breaker para orden estable */
export function buildMongoSort(sortBy: SortBy, sortDir: SortDir): Record<string, 1 | -1> {
	const dir = sortDir === 'asc' ? 1 : -1;
	return { [sortBy]: dir, _id: dir };
}
