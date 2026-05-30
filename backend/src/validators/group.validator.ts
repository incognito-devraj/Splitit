import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

export const createGroupSchema = z.object({
  body: z.object({
    name:        z.string().min(2).max(80).trim(),
    description: z.string().max(300).trim().optional().default(''),
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

export const updateGroupSettingsSchema = z.object({
  body: z.object({
    name:        z.string().min(2).max(80).trim().optional(),
    description: z.string().max(300).trim().optional(),
    isPublic:    z.boolean().optional(),
  }).refine(d => Object.keys(d).length > 0, { message: 'Provide at least one field to update' }),
});

export const discoverGroupsSchema = z.object({
  query: z.object({
    search: z.string().max(80).optional(),
    page:   z.string().regex(/^\d+$/).transform(Number).optional(),
    limit:  z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});
