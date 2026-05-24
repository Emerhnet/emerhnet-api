import type { Request, Response, NextFunction } from "express";
import {
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schemas";
import * as authService from "./auth.service";
import { setAuthCookies, clearAuthCookies } from "../../shared/cookies";
import { REFRESH_COOKIE } from "../../middleware/auth";
import { Unauthorized } from "../../shared/errors";

function ctxFrom(req: Request) {
  return { ip: req.ip, userAgent: req.get("user-agent") ?? undefined };
}

export async function postSignIn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = signInSchema.parse(req.body);
    const { tokens, user } = await authService.signIn(
      input.email,
      input.password,
      ctxFrom(req),
    );
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function postRefresh(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw Unauthorized("Missing refresh token");
    const tokens = await authService.refresh(token, ctxFrom(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function postSignOut(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    await authService.signOut(token, ctxFrom(req));
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Unauthorized();
    const user = await authService.getMe(req.user.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function postForgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(input.email, ctxFrom(req));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function postResetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(
      input.token,
      input.newPassword,
      ctxFrom(req),
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
