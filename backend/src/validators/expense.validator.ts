import { z } from 'zod';
import { CATEGORIES } from '../models/Expense.model';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const categoryEnum = CATEGORIES as unknown as [string, ...string[]];

export const createExpenseSchema = z.object({
  body: z.object({
    title:      z.string().trim().min(1, 'Description is required').max(200),
    category:   z.enum(categoryEnum, { errorMap: () => ({ message: 'Invalid category' }) }),
    amount:     z.number({ invalid_type_error: 'Amount must be a number' }).positive().max(1_000_000),
    sharedWith: z.array(objectId).min(0).max(50).default([]),
    guestNames: z
      .array(z.string().trim().min(1).max(100))
      .max(20, 'Maximum 20 guests per expense')
      .default([]),
    notes:      z.string().trim().min(1, 'Description is required').max(500),
  }).refine(
    (d) => d.sharedWith.length + d.guestNames.length >= 1,
    { message: 'Expense must have at least 1 participant (member or guest)' },
  ),
});

export const updateExpenseSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    title:      z.string().trim().min(1, 'Description is required').max(200).optional(),
    category:   z.enum(categoryEnum).optional(),
    amount:     z.number().positive().max(1_000_000).optional(),
    sharedWith: z.array(objectId).min(0).max(50).optional(),
    guestNames: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
    notes:      z.string().trim().min(1, 'Description is required').max(500).optional(),
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
    _t:        z.string().optional(), // cache-bust param — ignored
  }),
});
