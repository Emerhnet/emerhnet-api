import crypto from 'crypto';
import { Hospital, type HospitalDoc } from './hospital.model';
import type { RegisterHospitalInput } from './hospital.schemas';
import { Conflict, NotFound } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';
import { getPresignedUrl } from '../upload/upload.service';
import { User } from '../auth/user.model';
import { hashPassword } from '../../shared/password';
import { sendHospitalAdminWelcomeEmail } from '../../shared/email';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import {
  markInvitationSubmitted,
  markInvitationApproved,
} from '../invitations/invitation.service';

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  const bytes = crypto.randomBytes(16);
  const pick = (pool: string, byte: number) => pool[byte % pool.length]!;
  const required = [
    pick(upper, bytes[0]!),
    pick(lower, bytes[1]!),
    pick(digits, bytes[2]!),
    pick(symbols, bytes[3]!),
  ];
  const rest: string[] = [];
  for (let i = 4; i < 14; i++) rest.push(pick(all, bytes[i]!));
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i % bytes.length]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

function generateTrackingId(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return `EMR-${year}-${code}`;
}

export async function registerHospital(input: RegisterHospitalInput) {
  const existing = await Hospital.findOne({ nin: input.nin }).lean();
  if (existing) throw Conflict('A hospital with this NIN is already registered');

  const hospital = await Hospital.create({
    trackingId: generateTrackingId(),
    hospitalName: input.hospitalName,
    nin: input.nin,
    ceaLicenceNumber: input.ceaLicenceNumber ?? '',
    category: input.category,
    cghsEmpanelment: input.cghsEmpanelment === 'Yes',
    ayushmanEmpanelment: input.ayushmanEmpanelment === 'Yes',
    address: {
      line1: input.address.line1,
      line2: input.address.line2 ?? '',
      city: input.address.city,
      state: input.address.state,
      pincode: input.address.pincode,
      latitude: parseFloat(input.address.latitude),
      longitude: parseFloat(input.address.longitude),
    },
    contact: input.contact,
    adminContact: {
      name: input.adminContact.name,
      email: input.adminContact.email,
      phone: input.adminContact.phone,
    },
    documents: input.documents ?? [],
    status: 'pending',
  });

  await writeAudit({
    action: 'hospital.registered',
    entityType: 'Hospital',
    entityId: hospital.id,
    after: { trackingId: hospital.trackingId, nin: hospital.nin },
  });

  if (input.inviteToken) {
    try {
      const invInfo = await markInvitationSubmitted(input.inviteToken, hospital.id);
      if (invInfo) {
        await autoApproveInvitedHospital(hospital, invInfo.sentByUserId);
      }
    } catch (err) {
      logger.error({ err, hospitalId: hospital.id }, 'failed to auto-approve invited hospital');
    }
  }

  return { trackingId: hospital.trackingId };
}

async function provisionHospitalAdmin(h: HospitalDoc, actorUserId: string) {
  const adminEmail = h.adminContact.email.toLowerCase();
  const emailTaken = await User.findOne({ email: adminEmail }).lean();
  if (emailTaken) {
    throw Conflict('Admin contact email is already registered to another user');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const adminUser = await User.create({
    email: adminEmail,
    passwordHash,
    fullName: h.adminContact.name,
    role: 'hospitalAdmin',
    hospitalId: h._id,
    status: 'pendingPasswordSet',
    mustChangePassword: true,
  });

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    hospitalId: h.id,
    action: 'user.created',
    entityType: 'User',
    entityId: adminUser.id,
  });

  const signInUrl = `${env.APP_URL.replace(/\/$/, '')}/sign-in`;
  let emailSent = true;
  try {
    await sendHospitalAdminWelcomeEmail({
      to: adminEmail,
      fullName: h.adminContact.name,
      hospitalName: h.hospitalName,
      tempPassword,
      signInUrl,
    });
  } catch (err) {
    emailSent = false;
    logger.error({ err, hospitalId: h.id }, 'failed to send admin welcome email');
  }

  return { email: adminEmail, tempPassword, mustChangePassword: true, emailSent };
}

async function autoApproveInvitedHospital(h: HospitalDoc, actorUserId: string): Promise<void> {
  h.status = 'approved';
  h.approvedAt = new Date();
  h.reviewNotes = 'Auto-approved via invitation';
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'hospital.approved',
    entityType: 'Hospital',
    entityId: h.id,
    after: { auto: true, source: 'invitation' },
  });

  await provisionHospitalAdmin(h, actorUserId);

  try {
    await markInvitationApproved(h.id);
  } catch (err) {
    logger.error({ err, hospitalId: h.id }, 'failed to mark invitation approved');
  }
}

export async function listHospitals(opts: {
  status?: string;
  category?: string;
  state?: string;
  cghs?: boolean;
  ayushman?: boolean;
  from?: string;
  to?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.category) filter.category = opts.category;
  if (opts.state) filter['address.state'] = opts.state;
  if (opts.cghs === true) filter.cghsEmpanelment = true;
  if (opts.ayushman === true) filter.ayushmanEmpanelment = true;
  if (opts.from || opts.to) {
    const dateFilter: Record<string, Date> = {};
    if (opts.from) dateFilter.$gte = new Date(opts.from);
    if (opts.to) dateFilter.$lte = new Date(opts.to + 'T23:59:59Z');
    filter.createdAt = dateFilter;
  }
  if (opts.search) {
    const re = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ hospitalName: re }, { nin: re }, { trackingId: re }, { 'address.city': re }];
  }

  const [docs, total] = await Promise.all([
    Hospital.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .exec(),
    Hospital.countDocuments(filter),
  ]);

  return { items: docs.map((d) => d.toJSON()), total, page: opts.page, pageSize: opts.pageSize };
}

export async function getHospital(id: string) {
  const h = await Hospital.findById(id).exec();
  if (!h) throw NotFound('Hospital not found');
  return h.toJSON();
}

export async function approveHospital(id: string, actorUserId: string, notes: string) {
  const h = await Hospital.findById(id);
  if (!h) throw NotFound('Hospital not found');

  h.status = 'approved';
  h.approvedAt = new Date();
  h.reviewNotes = notes;
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'hospital.approved',
    entityType: 'Hospital',
    entityId: h.id,
  });

  const admin = await provisionHospitalAdmin(h, actorUserId);

  try {
    await markInvitationApproved(h.id);
  } catch (err) {
    logger.error({ err, hospitalId: h.id }, 'failed to mark invitation approved');
  }

  return { hospital: h.toJSON(), admin };
}

export async function rejectHospital(id: string, actorUserId: string, notes: string) {
  const h = await Hospital.findById(id);
  if (!h) throw NotFound('Hospital not found');

  h.status = 'rejected';
  h.rejectedAt = new Date();
  h.reviewNotes = notes;
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'hospital.rejected',
    entityType: 'Hospital',
    entityId: h.id,
  });

  return h.toJSON();
}

export async function suspendHospital(id: string, actorUserId: string, notes: string) {
  const h = await Hospital.findById(id);
  if (!h) throw NotFound('Hospital not found');

  h.status = 'suspended';
  h.suspendedAt = new Date();
  h.reviewNotes = notes;
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'hospital.suspended',
    entityType: 'Hospital',
    entityId: h.id,
  });

  return h.toJSON();
}

async function hospitalToJsonWithPhotoUrls(h: HospitalDoc) {
  const json = h.toJSON() as Record<string, unknown> & {
    photos: Array<{ s3Key: string; fileName: string; sizeBytes: number; uploadedAt: Date | string }>;
  };
  const photos = await Promise.all(
    json.photos.map(async (p) => ({
      ...p,
      url: await getPresignedUrl(p.s3Key, 3600),
    })),
  );
  return { ...json, photos };
}

export async function getMyHospital(hospitalId: string) {
  const h = await Hospital.findById(hospitalId).exec();
  if (!h) throw NotFound('Hospital not found');
  return hospitalToJsonWithPhotoUrls(h);
}

export async function updateMyHospital(
  hospitalId: string,
  input: import('./hospital.schemas').UpdateMyHospitalInput,
  actorUserId: string,
) {
  const h = await Hospital.findById(hospitalId);
  if (!h) throw NotFound('Hospital not found');

  if (input.contact) {
    if (input.contact.email !== undefined) h.contact.email = input.contact.email;
    if (input.contact.phone !== undefined) h.contact.phone = input.contact.phone;
  }
  if (input.address) {
    if (input.address.line1 !== undefined) h.address.line1 = input.address.line1;
    if (input.address.line2 !== undefined) h.address.line2 = input.address.line2;
    if (input.address.city !== undefined) h.address.city = input.address.city;
    if (input.address.pincode !== undefined) h.address.pincode = input.address.pincode;
  }
  if (input.visitingHours !== undefined) h.visitingHours = input.visitingHours;
  if (input.description !== undefined) h.description = input.description;
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId: h.id,
    action: 'hospital.updated',
    entityType: 'Hospital',
    entityId: h.id,
  });

  return hospitalToJsonWithPhotoUrls(h);
}

export async function addHospitalPhoto(
  hospitalId: string,
  input: import('./hospital.schemas').AddPhotoInput,
  actorUserId: string,
) {
  const h = await Hospital.findById(hospitalId);
  if (!h) throw NotFound('Hospital not found');
  h.photos.push({
    s3Key: input.s3Key,
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    uploadedAt: new Date(),
  });
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId: h.id,
    action: 'hospital.photo_added',
    entityType: 'Hospital',
    entityId: h.id,
    after: { s3Key: input.s3Key },
  });

  return hospitalToJsonWithPhotoUrls(h);
}

export async function deleteHospitalPhoto(
  hospitalId: string,
  s3Key: string,
  actorUserId: string,
) {
  const h = await Hospital.findById(hospitalId);
  if (!h) throw NotFound('Hospital not found');
  const before = h.photos.length;
  h.photos = h.photos.filter((p) => p.s3Key !== s3Key);
  if (h.photos.length === before) throw NotFound('Photo not found');
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId: h.id,
    action: 'hospital.photo_removed',
    entityType: 'Hospital',
    entityId: h.id,
    after: { s3Key },
  });

  return hospitalToJsonWithPhotoUrls(h);
}

export async function getHospitalDocumentUrl(hospitalId: string, slotKey: string): Promise<string> {
  const h = await Hospital.findById(hospitalId).exec();
  if (!h) throw NotFound('Hospital not found');
  const doc = h.documents.find((d) => d.slotKey === slotKey);
  if (!doc) throw NotFound('Document not found');
  return getPresignedUrl(doc.s3Key, 300); // 5-minute presigned URL
}

export async function reactivateHospital(id: string, actorUserId: string) {
  const h = await Hospital.findById(id);
  if (!h) throw NotFound('Hospital not found');

  h.status = 'approved';
  h.suspendedAt = null;
  h.reviewNotes = '';
  await h.save();

  await writeAudit({
    actorUserId,
    actorRole: 'superAdmin',
    action: 'hospital.reactivated',
    entityType: 'Hospital',
    entityId: h.id,
  });

  return h.toJSON();
}
