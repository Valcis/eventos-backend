export interface PageParams {
    page: number;
    pageSize: number;
}

const MAX_PAGE_SIZE = 80;
const DEFAULT_PAGE_SIZE = 15;

export function parsePage(rawPage: unknown): number {
    const value = typeof rawPage === "string" ? parseInt(rawPage, 10) : Number(rawPage);
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.trunc(value);
}

export function parsePageSize(rawPageSize: unknown): number {
    const value = typeof rawPageSize === "string" ? parseInt(rawPageSize, 10) : Number(rawPageSize);
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_PAGE_SIZE;
    return Math.min(Math.trunc(value), MAX_PAGE_SIZE);
}
