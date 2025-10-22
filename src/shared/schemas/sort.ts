1// src/shared/schemas/sort.ts
import { z } from 'zod';

export const SortDir = z.enum(['asc', 'desc']);
export const SortBy = z.enum(['createdAt', 'updatedAt', 'amount']); // ajusta a tu dominio

export const SortQuery = z.object({
  sortBy: SortBy.default('createdAt'),
  sortDir: SortDir.default('desc'),
}).strict();

export type SortQuery = z.infer<typeof SortQuery>;
