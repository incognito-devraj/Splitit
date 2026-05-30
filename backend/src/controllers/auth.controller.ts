import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { ok, created } from '../utils/response';

export async function googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { idToken } = req.body as { idToken: string };
    const result = await authService.googleLogin(idToken);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refreshTokens(refreshToken);
    ok(res, tokens);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    await authService.logout(req.user._id, refreshToken);
    ok(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user._id);
    ok(res, user);
  } catch (err) {
    next(err);
  }
}
