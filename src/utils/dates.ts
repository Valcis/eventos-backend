export function toISO(_date: unknown): string | null {
    if (_date instanceof Date) return _date.toISOString();
    if (typeof _date === 'string') {
        const dateTime = new Date(_date);
        return isNaN(dateTime.getTime()) ? null : dateTime.toISOString();
    }
    return null;
}

export function ensureDate(input: unknown): Date | null {
    if (input instanceof Date) return input;
    if (typeof input === 'string') {
        const d = new Date(input);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}
