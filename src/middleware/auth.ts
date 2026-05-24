import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../shared/tokens';
import { Unauthorized, Forbidden } from '../shared/errors';

export type Role = 'superAdmin' | 'hospitalAdmin';

export interface AuthUser {
  userId: string;
  role: Role;
  hospitalId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const ACCESS_COOKIE = 'emn_at';
export const REFRESH_COOKIE = 'emn_rt';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(Unauthorized());
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.sub,
      role: payload.role,
      hospitalId: payload.hospitalId,
    };
    next();
  } catch {
    next(Unauthorized('Invalid or expired session'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) return next(Forbidden());
    next();
  };
}
