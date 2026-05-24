import { Types } from 'mongoose';
import { Doctor } from './doctor.model';
import { Department } from '../departments/department.model';
import type { CreateDoctorInput, UpdateDoctorInput } from './doctor.schemas';
import { Conflict, NotFound, ValidationError } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';

function hid(s: string) {
  return new Types.ObjectId(s);
}

async function assertDepartmentInHospital(hospitalId: string, departmentId: string) {
  const dept = await Department.findOne({
    _id: hid(departmentId),
    hospitalId: hid(hospitalId),
  }).lean();
  if (!dept) throw ValidationError('Department does not belong to this hospital');
}

export async function listDoctors(
  hospitalId: string,
  opts: {
    search?: string;
    departmentId?: string;
    status?: 'active' | 'deactivated';
    page: number;
    pageSize: number;
  },
) {
  const filter: Record<string, unknown> = { hospitalId: hid(hospitalId) };
  if (opts.departmentId) filter.departmentId = hid(opts.departmentId);
  if (opts.status === 'active') filter.deactivatedAt = null;
  if (opts.status === 'deactivated') filter.deactivatedAt = { $ne: null };
  if (opts.search) {
    const re = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: re }, { councilReg: re }, { email: re }];
  }

  const [docs, total] = await Promise.all([
    Doctor.find(filter)
      .sort({ fullName: 1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .exec(),
    Doctor.countDocuments(filter),
  ]);

  return {
    items: docs.map((d) => d.toJSON()),
    total,
    page: opts.page,
    pageSize: opts.pageSize,
  };
}

export async function getDoctor(hospitalId: string, id: string) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) }).exec();
  if (!d) throw NotFound('Doctor not found');
  return d.toJSON();
}

export async function createDoctor(hospitalId: string, input: CreateDoctorInput, actorUserId: string) {
  await assertDepartmentInHospital(hospitalId, input.departmentId);
  const clash = await Doctor.findOne({
    hospitalId: hid(hospitalId),
    councilReg: input.councilReg,
  }).lean();
  if (clash) throw Conflict('A doctor with this council registration already exists');

  const d = await Doctor.create({
    hospitalId: hid(hospitalId),
    fullName: input.fullName,
    councilReg: input.councilReg,
    council: input.council,
    departmentId: hid(input.departmentId),
    specialisation: input.specialisation ?? '',
    qualifications: input.qualifications ?? [],
    email: input.email,
    phone: input.phone,
    gender: input.gender,
    dob: input.dob ? new Date(input.dob) : null,
    joinedAt: new Date(input.joinedAt),
  });

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'doctor.created',
    entityType: 'Doctor',
    entityId: d.id,
  });

  return d.toJSON();
}

export async function updateDoctor(
  hospitalId: string,
  id: string,
  input: UpdateDoctorInput,
  actorUserId: string,
) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!d) throw NotFound('Doctor not found');

  if (input.departmentId && input.departmentId !== String(d.departmentId)) {
    await assertDepartmentInHospital(hospitalId, input.departmentId);
    d.departmentId = hid(input.departmentId);
  }
  if (input.councilReg !== undefined && input.councilReg !== d.councilReg) {
    const clash = await Doctor.findOne({
      hospitalId: hid(hospitalId),
      councilReg: input.councilReg,
      _id: { $ne: d._id },
    }).lean();
    if (clash) throw Conflict('A doctor with this council registration already exists');
    d.councilReg = input.councilReg;
  }
  if (input.fullName !== undefined) d.fullName = input.fullName;
  if (input.council !== undefined) d.council = input.council;
  if (input.specialisation !== undefined) d.specialisation = input.specialisation;
  if (input.qualifications !== undefined) d.qualifications = input.qualifications;
  if (input.email !== undefined) d.email = input.email;
  if (input.phone !== undefined) d.phone = input.phone;
  if (input.gender !== undefined) d.gender = input.gender;
  if (input.dob !== undefined) d.dob = input.dob ? new Date(input.dob) : null;
  if (input.joinedAt !== undefined) d.joinedAt = new Date(input.joinedAt);
  await d.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'doctor.updated',
    entityType: 'Doctor',
    entityId: d.id,
  });

  return d.toJSON();
}

export async function deactivateDoctor(hospitalId: string, id: string, actorUserId: string) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!d) throw NotFound('Doctor not found');
  if (d.deactivatedAt) return d.toJSON();
  d.deactivatedAt = new Date();
  await d.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'doctor.deactivated',
    entityType: 'Doctor',
    entityId: d.id,
  });

  return d.toJSON();
}

export async function reactivateDoctor(hospitalId: string, id: string, actorUserId: string) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!d) throw NotFound('Doctor not found');
  if (!d.deactivatedAt) return d.toJSON();
  d.deactivatedAt = null;
  await d.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'doctor.reactivated',
    entityType: 'Doctor',
    entityId: d.id,
  });

  return d.toJSON();
}
