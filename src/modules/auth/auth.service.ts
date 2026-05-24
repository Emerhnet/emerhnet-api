import crypto from 'crypto';
import { Types } from 'mongoose';
import { User, type UserDoc } from './user.model';
import { Session } from './session.model';
import { PasswordReset } from './password-reset.model';
import { hashPassword, verifyPassword } from '../../shared/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/tokens';
import { Unauthorized, NotFound, ValidationError } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import { sendPasswordResetEmail } from '../../shared/email';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

interface AuthContext {
  ip?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function userToResponse(u: UserDoc) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    hospitalId: u.hospitalId ? u.hospitalId.toString() : null,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

async function issueTokens(user: UserDoc, ctx: AuthContext): Promise<TokenPair> {
  const tokenId = crypto.randomUUID();
  await Session.create({
    userId: user._id,
    tokenId,
    userAgent: ctx.userAgent,
    ip: ctx.ip,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    hospitalId: user.hospitalId ? user.hospitalId.toString() : undefined,
  });
  const refreshToken = signRefreshToken({ sub: user.id, tokenId });
  return { accessToken, refreshToken };
}

export async function signIn(
  email: string,
  password: string,
  ctx: AuthContext,
): Promise<{ tokens: TokenPair; user: ReturnType<typeof userToResponse> }> {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || user.deactivatedAt) {
    await writeAudit({ action: 'auth.sign_in_failed', ip: ctx.ip, userAgent: ctx.userAgent });
    throw Unauthorized('Invalid email or password');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Unauthorized('Account is temporarily locked. Try again later.');
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    user.failedLoginCount = (user.failedLoginCount ?? 0) + 1;
    if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.status = 'locked';
      await user.save();
      await writeAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.account_locked',
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw Unauthorized('Account locked due to too many failed attempts');
    }
    await user.save();
    await writeAudit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.sign_in_failed',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    throw Unauthorized('Invalid email or password');
  }

  user.failedLoginCount = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  if (user.status === 'locked') user.status = 'active';
  await user.save();

  const tokens = await issueTokens(user, ctx);
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    hospitalId: user.hospitalId ? user.hospitalId.toString() : null,
    action: 'auth.sign_in',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { tokens, user: userToResponse(user) };
}

export async function refresh(refreshToken: string, ctx: AuthContext): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Unauthorized('Invalid refresh token');
  }

  const session = await Session.findOne({ tokenId: payload.tokenId });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw Unauthorized('Session expired or revoked');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.deactivatedAt || user.status === 'locked') {
    throw Unauthorized('Session no longer valid');
  }

  session.revokedAt = new Date();
  await session.save();

  const tokens = await issueTokens(user, ctx);
  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    hospitalId: user.hospitalId ? user.hospitalId.toString() : null,
    action: 'auth.refresh',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  return tokens;
}

export async function signOut(refreshToken: string | undefined, ctx: AuthContext): Promise<void> {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await Session.updateOne(
      { tokenId: payload.tokenId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await writeAudit({
      actorUserId: payload.sub,
      action: 'auth.sign_out',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  } catch {
    // Already invalid — nothing to revoke.
  }
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.deactivatedAt) throw Unauthorized();
  return userToResponse(user);
}

export async function requestPasswordReset(email: string, ctx: AuthContext): Promise<void> {
  const user = await User.findOne({ email });
  if (!user || user.deactivatedAt) {
    // Don't disclose; pretend success.
    logger.debug({ email }, 'password reset for unknown email');
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await PasswordReset.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  await writeAudit({
    actorUserId: user.id,
    action: 'auth.password_reset_requested',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  const resetUrl = `${env.APP_URL.replace(/\/$/, '')}/set-password/${token}`;
  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    logger.error({ err, userId: user.id }, 'failed to send password reset email');
    // Swallow — don't disclose to caller. Token remains valid; user can request again.
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
  ctx: AuthContext,
): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const reset = await PasswordReset.findOne({ tokenHash });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw ValidationError('Invalid or expired reset token');
  }

  const user = await User.findById(reset.userId);
  if (!user || user.deactivatedAt) throw NotFound('User not found');

  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  if (user.status === 'pendingPasswordSet' || user.status === 'locked') user.status = 'active';
  await user.save();

  reset.usedAt = new Date();
  await reset.save();

  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  await writeAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'auth.password_reset_completed',
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: 'superAdmin' | 'hospitalAdmin';
  hospitalId?: string;
}) {
  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    fullName: input.fullName,
    role: input.role,
    hospitalId: input.hospitalId ? new Types.ObjectId(input.hospitalId) : null,
  });
  return userToResponse(user);
}
