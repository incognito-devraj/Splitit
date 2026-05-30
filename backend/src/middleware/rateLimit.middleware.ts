import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isTest = env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  max: isTest ? 100_000 : parseInt(env.RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});
