export type SortDirection = 1 | -1;

export interface SortSpec<Field extends string> {
	field: Field;
	direction: SortDirection;
}

export function parseSort<Field extends string>(
	raw: unknown,
	whitelist: readonly Field[],
	fallback: SortSpec<Field>,
): SortSpec<Field> {
	if (typeof raw !== 'string') return fallback;
	const parts = raw.split(':');
	const field = parts[0] as Field;
	const dirToken = (parts[1] ?? 'desc').toLowerCase();
	const direction: SortDirection = dirToken === 'asc' ? 1 : -1;

	if (!whitelist.includes(field)) return fallback;
	return { field, direction };
}

export function toMongoSort<Field extends string>(
	sort: SortSpec<Field>,
): Record<string, SortDirection> {
	return { [sort.field]: sort.direction };
}
