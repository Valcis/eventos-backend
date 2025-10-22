// src/shared/lib/cursor.ts
import { ObjectId } from 'mongodb';
import type { SortBy, SortDir } from '../types/sort';

/**
 * Construye un filtro de "after" para el campo principal + _id como desempate.
 * Para ahora soportamos 'createdAt' y 'updatedAt'. Si añades otros campos,
 * extiende aquí con su lógica de comparación.
 */
export function buildAfterFilter(
	sortBy: SortBy,
	sortDir: SortDir,
	cursorDoc: { [k in SortBy]?: unknown } & { _id: ObjectId },
) {
	const isDesc = sortDir === 'desc';
	const mainOp = isDesc ? '$lt' : '$gt';
	const tieOp = isDesc ? '$lt' : '$gt';

	// Normaliza el valor principal (fecha en tu modelo)
	const mainValue =
		sortBy === 'createdAt' || sortBy === 'updatedAt'
			? new Date(String(cursorDoc[sortBy]))
			: cursorDoc[sortBy]; // si añades otros campos, normalízalos aquí

	return {
		$or: [
			{ [sortBy]: { [mainOp]: mainValue } },
			{ [sortBy]: mainValue, _id: { [tieOp]: cursorDoc._id } },
		],
	};
}
