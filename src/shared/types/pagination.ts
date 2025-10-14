export type PaginationQuery = {
	limit?: number | string;
	after?: string | null | undefined;
};

export type Page = {
	limit: number;
	after: string | null; // ← contrato fuerte para el backend
};
