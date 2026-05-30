import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';
import { User } from '../models/User.model';
import { unauthorized } from '../utils/response';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user: AccessTokenPayload & { _id: string };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }

  try {
    const token = header.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Confirm user still exists in DB
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      unauthorized(res, 'User no longer exists');
      return;
    }

    req.user = {
      ...payload,
      _id: payload.userId,
      groupId: user.groupId?.toString() ?? null,
      role: user.role,
    };

    next();
  } catch {
    unauthorized(res, 'Invalid or expired token');
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
}

export function requireGroup(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.groupId) {
    res.status(403).json({ success: false, message: 'You must be in a group to do this' });
    return;
  }
  next();
}
