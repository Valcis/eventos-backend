import type { SortBy, SortDir } from './sort';

export type PaginationQuery = {
	limit?: number | string;
	after?: string | null;
	sortBy?: SortBy;
	sortDir?: SortDir;
};

export type Page = {
	limit: number;
	after: string | null;
	sortBy: SortBy;
	sortDir: SortDir;
};
