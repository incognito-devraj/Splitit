import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Types } from 'mongoose';
import { UserRole } from '../models/User.model';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  groupId: string | null;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string; // ties JWT to the DB record
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string, tokenId: string): string {
  return jwt.sign({ userId, tokenId } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/** Parse "7d", "15m" etc. into milliseconds for DB expiry */
export function parseDuration(str: string): number {
  const unit = str.slice(-1);
  const val = parseInt(str.slice(0, -1), 10);
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * (map[unit] ?? 86_400_000);
}
