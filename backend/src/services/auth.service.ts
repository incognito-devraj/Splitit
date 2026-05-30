import { OAuth2Client } from 'google-auth-library';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { User, IUser } from '../models/User.model';
import { RefreshToken } from '../models/RefreshToken.model';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  parseDuration,
} from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

async function verifyGoogleToken(idToken: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError('Google OAuth is not configured on this server', 501);
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    logger.error('Google token verification failed:', (err as Error).message);
    throw new AppError('Google sign-in failed. Please try again.', 401);
  }

  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new AppError('Invalid Google token payload', 401);
  return { sub: p.sub, email: p.email, name: p.name ?? p.email, picture: p.picture ?? '' };
}

async function issueTokenPair(user: IUser): Promise<{ accessToken: string; refreshToken: string }> {
  // Create a DB refresh token record
  const tokenId = new Types.ObjectId().toString();
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));

  const rawRefresh = signRefreshToken(user._id.toString(), tokenId);

  await RefreshToken.create({
    userId: user._id,
    token: rawRefresh,
    expiresAt,
  });

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    groupId: user.groupId?.toString() ?? null,
    activeGroupId: user.groupId?.toString() ?? null,
  });

  return { accessToken, refreshToken: rawRefresh };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function googleLogin(idToken: string) {
  const profile = await verifyGoogleToken(idToken);

  try {
  // Try to find by googleId first, then fall back to email (handles pre-existing accounts)
  let user = await User.findOne({ googleId: profile.sub });

  if (!user) {
    // Check if an account with this email already exists (link it)
    user = await User.findOneAndUpdate(
      { email: profile.email },
      { $set: { googleId: profile.sub, name: profile.name, avatar: profile.picture } },
      { new: true },
    );
  }

  if (!user) {
    // Brand new user — create them
    user = await User.create({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatar: profile.picture,
    });
  } else {
    // Existing user found by googleId — refresh name/avatar
    user = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { name: profile.name, avatar: profile.picture } },
      { new: true },
    ) ?? user;
  }

  if (!user.groupIds.length && user.groupId) {
    user.groupIds = [user.groupId];
    await user.save();
  }

  const tokens = await issueTokenPair(user);
  logger.info(`Login: ${user.email}`);
  return { user, ...tokens };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('googleLogin DB error:', (err as Error).message);
    throw new AppError('Login failed due to a server error. Please try again.', 500);
  }
}

export async function refreshTokens(rawToken: string) {
  // 1. Verify JWT signature
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // 2. Check DB record exists (not revoked)
  const record = await RefreshToken.findOne({ token: rawToken, userId: payload.userId });
  if (!record) throw new AppError('Refresh token revoked or not found', 401);

  // 3. Delete old record (rotation)
  await record.deleteOne();

  // 4. Load user
  const user = await User.findById(payload.userId);
  if (!user) throw new AppError('User not found', 401);

  // 5. Issue new pair
  const tokens = await issueTokenPair(user);
  return tokens;
}

export async function logout(userId: string, rawToken?: string) {
  if (rawToken) {
    // Revoke specific token
    await RefreshToken.deleteOne({ token: rawToken, userId });
  } else {
    // Revoke all tokens for this user
    await RefreshToken.deleteMany({ userId });
  }
  logger.info(`Logout: userId=${userId}`);
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (!user.groupIds.length && user.groupId) {
    user.groupIds = [user.groupId];
    await user.save();
  }
  return user;
}
