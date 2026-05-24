import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { Forbidden } from '../shared/errors';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-xsrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
  return token;
}

export function csrf(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  if (!cookieToken) issueCsrfCookie(res);

  if (SAFE_METHODS.has(req.method)) return next();

  const headerToken = req.header(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(Forbidden('CSRF token mismatch'));
  }
  next();
}
