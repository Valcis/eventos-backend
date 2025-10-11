import {Decimal128} from "mongodb";

/**
 * Formatea un número como EUR (se mantiene compatibilidad con tu código actual).
 */
export function formatCurrencyEUR(value: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Representación segura de dinero en la API (decimal en string base-10).
 * Ejemplo: "1234.56"
 */
export type MoneyString = string;

/**
 * Conversión a Decimal128 para almacenar en Mongo sin pérdida.
 */
export function toDecimal128(amount: MoneyString): Decimal128 {
    return Decimal128.fromString(amount);
}

/**
 * Conversión desde Decimal128 a string decimal legible (sin pérdida).
 */
export function fromDecimal128(decimal: Decimal128): MoneyString {
    return decimal.toString();
}

/**
 * Convierte de unidades menores (centavos) a string decimal.
 */
export function moneyFromMinor(minorUnits: number, fractionDigits: number = 2): MoneyString {
    const sign = minorUnits < 0 ? "-" : "";
    const abs = Math.abs(minorUnits);
    const factor = 10 ** fractionDigits;
    const integers = Math.trunc(abs / factor);
    const decimals = String(abs % factor).padStart(fractionDigits, "0");
    return `${sign}${integers}.${decimals}`;
}

/**
 * Convierte de string decimal a unidades menores (centavos).
 */
export function moneyToMinor(amount: MoneyString, fractionDigits: number = 2): number {
    const normalized = amount.trim();
    const isNegative = normalized.startsWith("-");
    const unsigned = normalized.replace(/^[-+]/, "");
    const [ints = "0", decsRaw = ""] = unsigned.split(".");
    const decs = (decsRaw + "0".repeat(fractionDigits)).slice(0, fractionDigits);
    const value = parseInt(ints, 10) * 10 ** fractionDigits + parseInt(decs || "0", 10);
    return isNegative ? -value : value;
}

export function moneyStringToDecimal128(value: string): Decimal128 {
    if (!/^-?(0|[1-9]\d{0,4})\.\d{2}$/.test(value)) {
        throw new Error(`Money inválido: ${value}`);
    }
    return Decimal128.fromString(value);
}

export function decimal128ToMoneyString(value: Decimal128): string {
    const s = value.toString();
    if (!s.includes('.')) return s + '.00';
    const [i, d='00'] = s.split('.');
    return i + '.' + (d + '00').slice(0,2);
}
