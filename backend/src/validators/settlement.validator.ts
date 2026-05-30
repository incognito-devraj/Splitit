import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

export const requestSettlementSchema = z.object({
  body: z.object({
    toUserId: objectId,
    amount:   z.number({ invalid_type_error: 'Amount must be a number' }).positive().max(1_000_000),
    note:     z.string().max(300).trim().optional(),
  }),
});

export const settlementIdSchema = z.object({
  params: z.object({ id: objectId }),
});
