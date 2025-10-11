import { z } from 'zod';
export const Id = z.string().min(1);
export const DateTime = z.string().datetime();
export const Percentage = z.number().min(0).max(100);
export const Money = z.string().regex(/^-?(0|[1-9]\d{0,4})\.\d{2}$/);
export const Quantity = z.string().regex(/^(0|[1-9]\d{0,4})\.\d{2}$/);
export const SoftDelete = z.object({ isActive: z.boolean().default(true) });
