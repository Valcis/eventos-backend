export interface MetaPage {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface ItemEnvelope<T> {
	ok: true;
	data: T;
}

export interface ListEnvelope<T> {
	ok: true;
	data: T[];
	meta: MetaPage;
}

export interface ErrorEnvelope {
	ok: false;
	code: string;
	message: string;
	details?: Record<string, unknown>;
}
