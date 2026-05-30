import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../config/env';

const isTest = env.NODE_ENV === 'test';
const isDev = env.NODE_ENV === 'development';

function keyGenerator(req: Request): string {
  const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown').replace('::ffff:', '');
  return `${ip}:${req.method}:${req.path}`;
}

function buildLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max: isTest || isDev ? Number.MAX_SAFE_INTEGER : max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip: () => isDev || isTest,
    message: { success: false, message },
  });
}

export const publicLimiter = buildLimiter(
  parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  Math.max(parseInt(env.RATE_LIMIT_MAX, 10), 300),
  'Too many requests. Please try again later.',
);

export const authLimiter = buildLimiter(15 * 60 * 1000, 20, 'Too many auth attempts. Try again in 15 minutes.');

export const joinRequestLimiter = buildLimiter(5 * 60 * 1000, 10, 'Too many join requests. Please wait a few minutes.');

export const adminLimiter = buildLimiter(60 * 1000, 60, 'Too many administrative requests. Please slow down.');

export const apiLimiter = publicLimiter;
