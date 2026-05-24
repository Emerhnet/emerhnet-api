import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../middleware/auth";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  hospitalId?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
