export function parsePage(input: unknown, defaultValue = 0) {
	const n = Number(input);
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : defaultValue;
}

export function parsePageSize(input: unknown, defaultValue = 25, max = 200) {
	const n = Number(input);
	if (!Number.isFinite(n) || n <= 0) return defaultValue;
	return Math.min(Math.floor(n), max);
}
