import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const localhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const nonWildcardOrigin = z
  .string()
  .url()
  .refine((value) => !value.includes('*'), 'Wildcard origins are not allowed');

const corsOriginsSchema = z
  .string()
  .optional()
  .superRefine((value, ctx) => {
    if (!value) return;

    const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
    for (const origin of origins) {
      if (!nonWildcardOrigin.safeParse(origin).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `CORS_ORIGINS contains an invalid origin: ${origin}`,
        });
      }
    }
  });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .refine(
      (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      'MONGODB_URI must be a MongoDB connection string',
    ),

  JWT_SECRET: isProd
    ? z.string().min(64, 'JWT_SECRET must be at least 64 characters in production')
    : z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: isProd
    ? z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters in production')
    : z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  GOOGLE_CLIENT_ID: isProd
    ? z.string().min(1, 'GOOGLE_CLIENT_ID is required in production')
    : z.string().optional(),
  GOOGLE_CLIENT_SECRET: isProd
    ? z.string().min(1, 'GOOGLE_CLIENT_SECRET is required in production')
    : z.string().optional(),

  FRONTEND_URL: nonWildcardOrigin
    .default('http://localhost:3000')
    .refine(
      (value) => !isProd || !localhostUrl.test(value),
      'FRONTEND_URL must be your deployed frontend URL in production',
    ),
  API_PUBLIC_URL: nonWildcardOrigin.optional(),
  CORS_ORIGINS: corsOriginsSchema,

  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('300'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
