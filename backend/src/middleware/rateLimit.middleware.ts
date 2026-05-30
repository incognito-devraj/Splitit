import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';

const isTest = env.NODE_ENV === 'test';
const isDev  = env.NODE_ENV === 'development';

/**
 * In development, skip rate limiting entirely for localhost.
 * This prevents false 429s when two browser windows share 127.0.0.1.
 */
function keyGenerator(req: Request): string {
  const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace('::ffff:', '');
  // In dev, give each request a unique key so limits are never hit
  if (isDev || isTest) return `dev-${ip}-${Date.now()}-${Math.random()}`;
  return ip;
}

export const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  max: isTest || isDev ? 100_000 : parseInt(env.RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest || isDev ? 100_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});

/** Dedicated limiter for join-request creation — more lenient than auth */
export const joinRequestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isTest || isDev ? 100_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, message: 'Too many join requests. Please wait a few minutes.' },
});
