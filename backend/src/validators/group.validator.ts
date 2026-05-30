import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).trim(),
  }),
});

export const joinGroupSchema = z.object({
  body: z.object({
    inviteCode: z.string().length(8).toUpperCase().trim(),
  }),
});

export const memberIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const transferAdminSchema = z.object({
  body: z.object({ newAdminId: objectId }),
});
