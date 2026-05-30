import { z } from 'zod';

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'idToken is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'refreshToken is required'),
  }),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});
