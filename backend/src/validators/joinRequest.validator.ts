import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

export const createJoinRequestSchema = z.object({
  body: z.object({
    inviteCode: z
      .string({ required_error: 'Invite code is required' })
      .length(8, 'Invite code must be exactly 8 characters')
      .toUpperCase()
      .trim(),
    memberType: z.enum(['permanent', 'occasional']).default('permanent'),
    message:    z.string().max(200).trim().optional().default(''),
  }),
});

export const createJoinRequestByGroupSchema = z.object({
  params: z.object({ groupId: objectId }),
  body: z.object({
    memberType: z.enum(['permanent', 'occasional']).default('permanent'),
    message:    z.string().max(200).trim().optional().default(''),
  }),
});

export const joinRequestIdSchema = z.object({
  params: z.object({
    id: objectId,
  }),
});

export const joinRequestStatusSchema = z.object({
  query: z.object({
    inviteCode: z
      .string({ required_error: 'Invite code is required' })
      .length(8, 'Invite code must be exactly 8 characters')
      .toUpperCase()
      .trim(),
  }),
});
