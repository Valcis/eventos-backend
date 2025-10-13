// Tipado común para paginación
export interface PaginationQuery {
	limit?: string | number;
	after?: string;
}

export interface Page {
	limit: number;
	after?: string | undefined;
}
