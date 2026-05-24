import crypto from 'crypto';
import { Types } from 'mongoose';
import { Invitation, type InvitationDoc } from './invitation.model';
import type { CreateInvitationInput } from './invitation.schemas';
import { Conflict, NotFound, ValidationError } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';
import { sendHospitalInvitationEmail } from '../../shared/email';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildRegisterUrl(token: string): string {
  return `${env.APP_URL.replace(/\/$/, '')}/register-hospital?invite=${token}`;
}

async function sendInviteEmail(inv: InvitationDoc, token: string): Promise<boolean> {
  try {
    await sendHospitalInvitationEmail({
      to: inv.recipientEmail,
      hospitalName: inv.hospitalName,
      registerUrl: buildRegisterUrl(token),
      expiresAt: inv.expiresAt,
    });
    return true;
  } catch (err) {
    logger.error({ err, invitationId: inv.id }, 'failed to send invitation email');
    return false;
  }
}

function autoExpireIfNeeded(inv: InvitationDoc): boolean {
  if (
    inv.status !== 'submitted' &&
    inv.status !== 'approved' &&
    inv.status !== 'cancelled' &&
    inv.expiresAt < new Date()
  ) {
    inv.status = 'expired';
    return true;
  }
  return false;
}

export async function createInvitation(input: CreateInvitationInput, actorUserId: string) {
  const existing = await Invitation.findOne({
    recipientEmail: input.recipientEmail,
    status: { $in: ['sent', 'opened'] },
  }).lean();
  if (existing) {
    throw Conflict('An active invitation already exists for this email');
  }

  const { token, tokenHash } = generateToken();
  const inv = await Invitation.create({
    recipientEmail: input.recipientEmail,
    hospitalName: input.hospitalName,
    recipientRole: input.recipientRole ?? '',
    internalNotes: input.internalNotes ?? '',
    verificationNotes: input.verificationNotes,
    tokenHash,
    status: 'sent',
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    sentByUserId: new Types.ObjectId(actorUserId),
  });

  const emailSent = await sendInviteEmail(inv, token);

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'invitation.sent',
    entityType: 'Invitation',
    entityId: inv.id,
    after: { recipientEmail: inv.recipientEmail, hospitalName: inv.hospitalName },
  });

  return { invitation: inv.toJSON(), emailSent };
}

export async function listInvitations(opts: {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}) {
  // Roll forward expirations on read.
  await Invitation.updateMany(
    {
      status: { $in: ['sent', 'opened'] },
      expiresAt: { $lt: new Date() },
    },
    { $set: { status: 'expired' } },
  );

  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.search) {
    const s = opts.search.trim();
    if (s) {
      const regex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ recipientEmail: regex }, { hospitalName: regex }];
    }
  }
  if (opts.from || opts.to) {
    const dateFilter: Record<string, Date> = {};
    if (opts.from) dateFilter.$gte = new Date(opts.from);
    if (opts.to) dateFilter.$lte = new Date(opts.to + 'T23:59:59Z');
    filter.createdAt = dateFilter;
  }

  const total = await Invitation.countDocuments(filter);
  const docs = await Invitation.find(filter)
    .sort({ createdAt: -1 })
    .skip((opts.page - 1) * opts.pageSize)
    .limit(opts.pageSize)
    .exec();

  return {
    items: docs.map((d) => d.toJSON()),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
  };
}

export async function reissueInvitation(id: string, actorUserId: string) {
  const inv = await Invitation.findById(id);
  if (!inv) throw NotFound('Invitation not found');
  if (inv.status === 'submitted' || inv.status === 'approved') {
    throw ValidationError('Cannot reissue an invitation that has already been used');
  }

  const { token, tokenHash } = generateToken();
  inv.tokenHash = tokenHash;
  inv.expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  inv.status = 'sent';
  inv.openedAt = null;
  inv.cancelledAt = null;
  await inv.save();

  const emailSent = await sendInviteEmail(inv, token);

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'invitation.reissued',
    entityType: 'Invitation',
    entityId: inv.id,
  });

  return { invitation: inv.toJSON(), emailSent };
}

export async function cancelInvitation(id: string, actorUserId: string) {
  const inv = await Invitation.findById(id);
  if (!inv) throw NotFound('Invitation not found');
  if (inv.status === 'submitted' || inv.status === 'approved') {
    throw ValidationError('Cannot cancel an invitation that has already been used');
  }
  if (inv.status === 'cancelled') return inv.toJSON();

  inv.status = 'cancelled';
  inv.cancelledAt = new Date();
  await inv.save();

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'invitation.cancelled',
    entityType: 'Invitation',
    entityId: inv.id,
  });

  return inv.toJSON();
}

/**
 * Public verify — used by the registration page to pre-fill from an invite token.
 * Marks the invitation as opened on first hit.
 */
export async function verifyInvitation(token: string) {
  const tokenHash = hashToken(token);
  const inv = await Invitation.findOne({ tokenHash });
  if (!inv) throw NotFound('Invitation not found');

  if (autoExpireIfNeeded(inv)) {
    await inv.save();
  }

  if (inv.status === 'cancelled') throw ValidationError('This invitation has been cancelled');
  if (inv.status === 'expired') throw ValidationError('This invitation has expired');
  if (inv.status === 'submitted' || inv.status === 'approved') {
    throw ValidationError('This invitation has already been used');
  }

  if (inv.status === 'sent') {
    inv.status = 'opened';
    inv.openedAt = new Date();
    await inv.save();
  }

  return {
    hospitalName: inv.hospitalName,
    recipientEmail: inv.recipientEmail,
    recipientRole: inv.recipientRole,
    expiresAt: inv.expiresAt.toISOString(),
  };
}

/**
 * Called from hospital register flow when an invite token is supplied.
 * Marks invitation submitted and links the new hospital.
 * Returns the invitation doc (or null if token unknown) so callers can use
 * sentByUserId etc. for downstream auto-approval.
 */
export async function markInvitationSubmitted(
  token: string,
  hospitalId: string,
): Promise<{ sentByUserId: string } | null> {
  const tokenHash = hashToken(token);
  const inv = await Invitation.findOne({ tokenHash });
  if (!inv) return null;
  if (inv.status === 'cancelled') return null;
  if (inv.expiresAt < new Date()) return null;
  if (inv.status === 'submitted' || inv.status === 'approved') {
    return { sentByUserId: inv.sentByUserId.toString() };
  }
  inv.status = 'submitted';
  inv.submittedAt = new Date();
  inv.hospitalId = new Types.ObjectId(hospitalId);
  await inv.save();
  return { sentByUserId: inv.sentByUserId.toString() };
}

/**
 * Called from hospital approve flow when a hospital that came from an invite is approved.
 */
export async function markInvitationApproved(hospitalId: string): Promise<void> {
  const inv = await Invitation.findOne({ hospitalId: new Types.ObjectId(hospitalId) });
  if (!inv) return;
  if (inv.status === 'approved') return;
  inv.status = 'approved';
  inv.approvedAt = new Date();
  await inv.save();
}
