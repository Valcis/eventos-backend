export function formatCurrencyEUR(value: number): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency', currency: 'EUR', maximumFractionDigits: 2
    }).format(value);
}
