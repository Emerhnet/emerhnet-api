import { Types } from 'mongoose';
import { Department } from './department.model';
import { Doctor } from '../doctors/doctor.model';
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from './department.schemas';
import { Conflict, NotFound } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';

function hid(s: string) {
  return new Types.ObjectId(s);
}

async function buildDepartmentResponse(
  hospitalId: string,
  deptIds: Types.ObjectId[],
): Promise<Record<string, number>> {
  if (deptIds.length === 0) return {};
  const counts = await Doctor.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        hospitalId: hid(hospitalId),
        departmentId: { $in: deptIds },
        deactivatedAt: null,
      },
    },
    { $group: { _id: '$departmentId', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
}

export async function listDepartments(hospitalId: string, opts: { search?: string; active?: boolean }) {
  const filter: Record<string, unknown> = { hospitalId: hid(hospitalId) };
  if (opts.search) {
    filter.name = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  if (opts.active !== undefined) filter.active = opts.active;

  const docs = await Department.find(filter).sort({ name: 1 }).exec();
  const counts = await buildDepartmentResponse(
    hospitalId,
    docs.map((d) => d._id),
  );

  const headIds = docs.map((d) => d.headDoctorId).filter((id): id is Types.ObjectId => Boolean(id));
  const heads = headIds.length
    ? await Doctor.find({ _id: { $in: headIds } }).select('fullName').exec()
    : [];
  const headMap = new Map(heads.map((h) => [String(h._id), h.fullName]));

  return docs.map((d) => ({
    ...d.toJSON(),
    doctorCount: counts[d.id] ?? 0,
    headDoctorName: d.headDoctorId ? headMap.get(String(d.headDoctorId)) ?? null : null,
  }));
}

export async function createDepartment(
  hospitalId: string,
  input: CreateDepartmentInput,
  actorUserId: string,
) {
  const existing = await Department.findOne({ hospitalId: hid(hospitalId), name: input.name }).lean();
  if (existing) throw Conflict('A department with this name already exists');

  const dept = await Department.create({
    hospitalId: hid(hospitalId),
    name: input.name,
    headDoctorId: input.headDoctorId ? hid(input.headDoctorId) : null,
    active: true,
  });

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'department.created',
    entityType: 'Department',
    entityId: dept.id,
    after: { name: dept.name },
  });

  return dept.toJSON();
}

export async function updateDepartment(
  hospitalId: string,
  id: string,
  input: UpdateDepartmentInput,
  actorUserId: string,
) {
  const dept = await Department.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!dept) throw NotFound('Department not found');

  if (input.name !== undefined && input.name !== dept.name) {
    const clash = await Department.findOne({
      hospitalId: hid(hospitalId),
      name: input.name,
      _id: { $ne: dept._id },
    }).lean();
    if (clash) throw Conflict('A department with this name already exists');
    dept.name = input.name;
  }
  if (input.headDoctorId !== undefined) {
    dept.headDoctorId = input.headDoctorId ? hid(input.headDoctorId) : null;
  }
  if (input.active !== undefined) dept.active = input.active;
  await dept.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'department.updated',
    entityType: 'Department',
    entityId: dept.id,
  });

  return dept.toJSON();
}

export async function deleteDepartment(
  hospitalId: string,
  id: string,
  actorUserId: string,
) {
  const dept = await Department.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!dept) throw NotFound('Department not found');

  const inUse = await Doctor.countDocuments({
    hospitalId: hid(hospitalId),
    departmentId: dept._id,
    deactivatedAt: null,
  });
  if (inUse > 0) {
    throw Conflict(`Cannot delete: ${inUse} active doctor(s) assigned to this department`);
  }

  await dept.deleteOne();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'department.deleted',
    entityType: 'Department',
    entityId: id,
  });
}
