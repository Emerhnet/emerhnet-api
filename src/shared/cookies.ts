import type { Response, CookieOptions } from "express";
import { env } from "../config/env";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "../middleware/auth";

function baseCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOpts(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOpts(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOpts() });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOpts(),
    path: "/api/v1/auth",
  });
}
