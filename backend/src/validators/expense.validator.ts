import { z } from 'zod';
import { CATEGORIES } from '../models/Expense.model';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const categoryEnum = CATEGORIES as unknown as [string, ...string[]];

export const createExpenseSchema = z.object({
  body: z.object({
    title:      z.string().max(200).trim().optional(),
    category:   z.enum(categoryEnum, { errorMap: () => ({ message: 'Invalid category' }) }),
    amount:     z.number({ invalid_type_error: 'Amount must be a number' }).positive().max(1_000_000),
    sharedWith: z.array(objectId).min(1).max(50),
    notes:      z.string().max(500).trim().optional(),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    title:      z.string().max(200).trim().optional(),
    category:   z.enum(categoryEnum).optional(),
    amount:     z.number().positive().max(1_000_000).optional(),
    sharedWith: z.array(objectId).min(1).max(50).optional(),
    notes:      z.string().max(500).trim().optional(),
  }).refine(d => Object.keys(d).length > 0, { message: 'Provide at least one field to update' }),
});

export const expenseIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const listExpensesSchema = z.object({
  query: z.object({
    category:  z.enum(categoryEnum).optional(),
    startDate: z.string().optional(),
    endDate:   z.string().optional(),
    page:      z.string().regex(/^\d+$/).transform(Number).optional(),
    limit:     z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});
