import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  PORT:     z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── MongoDB ────────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // ── JWT ────────────────────────────────────────────────────────────────────
  // In production enforce 64-char secrets; dev allows 32 for convenience
  JWT_SECRET: isProd
    ? z.string().min(64, 'JWT_SECRET must be at least 64 characters in production')
    : z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: isProd
    ? z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters in production')
    : z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // ── Google OAuth ───────────────────────────────────────────────────────────
  // Required in production; optional in dev so server starts without them
  GOOGLE_CLIENT_ID: isProd
    ? z.string().min(1, 'GOOGLE_CLIENT_ID is required in production')
    : z.string().optional(),
  GOOGLE_CLIENT_SECRET: isProd
    ? z.string().min(1, 'GOOGLE_CLIENT_SECRET is required in production')
    : z.string().optional(),

  // ── CORS / Frontend ────────────────────────────────────────────────────────
  // FRONTEND_URL: your deployed frontend URL (e.g. https://splitit.vercel.app)
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  // CORS_ORIGINS: comma-separated extra allowed origins for deployment
  CORS_ORIGINS: z.string().optional(),

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),  // 15 min
  RATE_LIMIT_MAX:       z.string().default('300'),      // requests per window
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
