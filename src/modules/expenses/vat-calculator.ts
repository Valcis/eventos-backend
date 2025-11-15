import { AppError } from '../../core/http/errors';

/**
 * Resultado del cálculo de IVA
 */
export interface VATCalculationResult {
	basePrice: string; // Money format
	vatPct: number;
	vatAmount: string; // Money format
	netPrice: string; // Money format
}

/**
 * Convierte Money string a céntimos
 */
function moneyToCents(money: string): number {
	return Math.round(parseFloat(money) * 100);
}

/**
 * Convierte céntimos a Money string
 */
function centsToMoney(cents: number): string {
	return (cents / 100).toFixed(2);
}

/**
 * Calcula IVA automáticamente desde basePrice
 *
 * Según pricing-logic.md:
 * - netPrice = basePrice * (1 + vatPct/100)
 * - vatAmount = netPrice - basePrice
 *
 * @param basePrice - Precio base sin IVA (Money format)
 * @param vatPct - Porcentaje de IVA (0, 4, 10, 21)
 */
export function calculateVATFromBase(basePrice: string, vatPct: number): VATCalculationResult {
	// Validar vatPct
	if (![0, 4, 10, 21].includes(vatPct)) {
		throw new AppError(
			'VALIDATION_ERROR',
			`vatPct debe ser 0, 4, 10 o 21. Recibido: ${vatPct}`,
			400,
		);
	}

	const basePriceCents = moneyToCents(basePrice);
	const netPriceCents = Math.round(basePriceCents * (1 + vatPct / 100));
	const vatAmountCents = netPriceCents - basePriceCents;

	return {
		basePrice: centsToMoney(basePriceCents),
		vatPct: vatPct,
		vatAmount: centsToMoney(vatAmountCents),
		netPrice: centsToMoney(netPriceCents),
	};
}

/**
 * Calcula basePrice desde netPrice (inverso)
 *
 * Fórmula:
 * - basePrice = netPrice / (1 + vatPct/100)
 * - vatAmount = netPrice - basePrice
 *
 * @param netPrice - Precio final con IVA (Money format)
 * @param vatPct - Porcentaje de IVA (0, 4, 10, 21)
 */
export function calculateVATFromNet(netPrice: string, vatPct: number): VATCalculationResult {
	// Validar vatPct
	if (![0, 4, 10, 21].includes(vatPct)) {
		throw new AppError(
			'VALIDATION_ERROR',
			`vatPct debe ser 0, 4, 10 o 21. Recibido: ${vatPct}`,
			400,
		);
	}

	const netPriceCents = moneyToCents(netPrice);
	const basePriceCents = Math.round(netPriceCents / (1 + vatPct / 100));
	const vatAmountCents = netPriceCents - basePriceCents;

	return {
		basePrice: centsToMoney(basePriceCents),
		vatPct: vatPct,
		vatAmount: centsToMoney(vatAmountCents),
		netPrice: centsToMoney(netPriceCents),
	};
}

/**
 * Valida coherencia de basePrice, vatAmount y netPrice
 *
 * Según pricing-logic.md:
 * - Si vienen los 3 campos, validar que sean coherentes
 *
 * @returns true si son coherentes, false si no
 */
export function validateVATCoherence(
	basePrice: string,
	vatPct: number,
	vatAmount: string,
	netPrice: string,
): { isValid: boolean; expectedValues?: VATCalculationResult; error?: string } {
	// Calcular valores esperados desde basePrice
	const expected = calculateVATFromBase(basePrice, vatPct);

	// Comparar con valores recibidos (tolerancia de 1 céntimo por redondeo)
	const basePriceCents = moneyToCents(basePrice);
	const vatAmountCents = moneyToCents(vatAmount);
	const netPriceCents = moneyToCents(netPrice);

	const expectedBaseCents = moneyToCents(expected.basePrice);
	const expectedVatCents = moneyToCents(expected.vatAmount);
	const expectedNetCents = moneyToCents(expected.netPrice);

	const baseMatch = Math.abs(basePriceCents - expectedBaseCents) <= 1;
	const vatMatch = Math.abs(vatAmountCents - expectedVatCents) <= 1;
	const netMatch = Math.abs(netPriceCents - expectedNetCents) <= 1;

	if (!baseMatch || !vatMatch || !netMatch) {
		return {
			isValid: false,
			expectedValues: expected,
			error: `Valores de IVA incoherentes. Esperado: basePrice=${expected.basePrice}, vatAmount=${expected.vatAmount}, netPrice=${expected.netPrice}. Recibido: basePrice=${basePrice}, vatAmount=${vatAmount}, netPrice=${netPrice}`,
		};
	}

	return { isValid: true };
}

/**
 * Calcula o valida IVA según los campos presentes
 *
 * Casos:
 * 1. Solo basePrice + vatPct → Calcular vatAmount y netPrice
 * 2. Solo netPrice + vatPct → Calcular basePrice y vatAmount
 * 3. Los 3 campos → Validar coherencia
 *
 * @param data - Datos del gasto
 */
export function processVAT(data: {
	basePrice?: string;
	vatPct: number;
	vatAmount?: string;
	netPrice?: string;
}): VATCalculationResult {
	const { basePrice, vatPct, vatAmount, netPrice } = data;

	// Caso 1: Solo basePrice
	if (basePrice && !vatAmount && !netPrice) {
		return calculateVATFromBase(basePrice, vatPct);
	}

	// Caso 2: Solo netPrice
	if (!basePrice && !vatAmount && netPrice) {
		return calculateVATFromNet(netPrice, vatPct);
	}

	// Caso 3: Los 3 campos presentes → Validar coherencia
	if (basePrice && vatAmount && netPrice) {
		const validation = validateVATCoherence(basePrice, vatPct, vatAmount, netPrice);

		if (!validation.isValid) {
			throw new AppError('VALIDATION_ERROR', validation.error!, 400);
		}

		// Retornar valores validados
		return {
			basePrice,
			vatPct,
			vatAmount,
			netPrice,
		};
	}

	// Caso 4: Combinaciones inválidas
	throw new AppError(
		'VALIDATION_ERROR',
		'Debe proporcionar: (1) basePrice + vatPct, (2) netPrice + vatPct, o (3) los 3 campos (basePrice, vatAmount, netPrice) coherentes.',
		400,
	);
}
