import { Types } from "mongoose";
import { Doctor, type DoctorDoc } from "./doctor.model";
import { Department } from "../departments/department.model";
import type {
  CreateDoctorInput,
  UpdateDoctorInput,
  SetDutyStatusInput,
} from "./doctor.schemas";
import { Conflict, NotFound, ValidationError } from "../../shared/errors";
import { writeAudit } from "../../shared/audit";
import { getPresignedUrl } from "../upload/upload.service";

function hid(s: string) {
  return new Types.ObjectId(s);
}

async function assertDepartmentInHospital(
  hospitalId: string,
  departmentId: string,
) {
  const dept = await Department.findOne({
    _id: hid(departmentId),
    hospitalId: hid(hospitalId),
  }).lean();
  if (!dept)
    throw ValidationError("Department does not belong to this hospital");
}

async function toJsonWithPhotoUrl(d: DoctorDoc) {
  const out = d.toJSON() as Record<string, unknown> & {
    photoS3Key: string | null;
    photoUrl?: string | null;
  };
  if (d.photoS3Key) {
    try {
      out.photoUrl = await getPresignedUrl(d.photoS3Key, 3600);
    } catch {
      out.photoUrl = null;
    }
  } else {
    out.photoUrl = null;
  }
  return out;
}

export async function listDoctors(
  hospitalId: string,
  opts: {
    search?: string;
    departmentId?: string;
    status?: "active" | "deactivated";
    page: number;
    pageSize: number;
  },
) {
  const filter: Record<string, unknown> = { hospitalId: hid(hospitalId) };
  if (opts.departmentId) filter.departmentId = hid(opts.departmentId);
  if (opts.status === "active") filter.deactivatedAt = null;
  if (opts.status === "deactivated") filter.deactivatedAt = { $ne: null };
  if (opts.search) {
    const re = new RegExp(
      opts.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
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

  const items = await Promise.all(docs.map((d) => toJsonWithPhotoUrl(d)));
  return {
    items,
    total,
    page: opts.page,
    pageSize: opts.pageSize,
  };
}

export async function getDoctor(hospitalId: string, id: string) {
  const d = await Doctor.findOne({
    _id: hid(id),
    hospitalId: hid(hospitalId),
  }).exec();
  if (!d) throw NotFound("Doctor not found");
  return toJsonWithPhotoUrl(d);
}

export async function createDoctor(
  hospitalId: string,
  input: CreateDoctorInput,
  actorUserId: string,
) {
  await assertDepartmentInHospital(hospitalId, input.departmentId);
  const clash = await Doctor.findOne({
    hospitalId: hid(hospitalId),
    councilReg: input.councilReg,
  }).lean();
  if (clash)
    throw Conflict("A doctor with this council registration already exists");

  const d = await Doctor.create({
    hospitalId: hid(hospitalId),
    fullName: input.fullName,
    councilReg: input.councilReg,
    council: input.council,
    departmentId: hid(input.departmentId),
    specialisation: input.specialisation ?? "",
    qualifications: input.qualifications ?? [],
    email: input.email,
    phone: input.phone,
    gender: input.gender,
    dob: input.dob ? new Date(input.dob) : null,
    joinedAt: new Date(input.joinedAt),
    opdRoom: input.opdRoom ?? "",
    photoS3Key: input.photoS3Key ?? null,
    dutyStatus: input.dutyStatus ?? "active",
    consultationSchedule: input.consultationSchedule ?? null,
  });

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "doctor.created",
    entityType: "Doctor",
    entityId: d.id,
  });

  return toJsonWithPhotoUrl(d);
}

export async function updateDoctor(
  hospitalId: string,
  id: string,
  input: UpdateDoctorInput,
  actorUserId: string,
) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!d) throw NotFound("Doctor not found");

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
    if (clash)
      throw Conflict("A doctor with this council registration already exists");
    d.councilReg = input.councilReg;
  }
  if (input.fullName !== undefined) d.fullName = input.fullName;
  if (input.council !== undefined) d.council = input.council;
  if (input.specialisation !== undefined)
    d.specialisation = input.specialisation;
  if (input.qualifications !== undefined)
    d.qualifications = input.qualifications;
  if (input.email !== undefined) d.email = input.email;
  if (input.phone !== undefined) d.phone = input.phone;
  if (input.gender !== undefined) d.gender = input.gender;
  if (input.dob !== undefined) d.dob = input.dob ? new Date(input.dob) : null;
  if (input.joinedAt !== undefined) d.joinedAt = new Date(input.joinedAt);
  if (input.opdRoom !== undefined) d.opdRoom = input.opdRoom;
  if (input.photoS3Key !== undefined) d.photoS3Key = input.photoS3Key;
  if (input.dutyStatus !== undefined) d.dutyStatus = input.dutyStatus;
  if (input.consultationSchedule !== undefined)
    d.consultationSchedule = input.consultationSchedule;
  await d.save();

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "doctor.updated",
    entityType: "Doctor",
    entityId: d.id,
  });

  return toJsonWithPhotoUrl(d);
}

export async function setDutyStatus(
  hospitalId: string,
  id: string,
  input: SetDutyStatusInput,
  actorUserId: string,
) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!d) throw NotFound("Doctor not found");
  d.dutyStatus = input.dutyStatus;
  await d.save();

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "doctor.duty_status_changed",
    entityType: "Doctor",
    entityId: d.id,
    after: { dutyStatus: input.dutyStatus },
  });

  return toJsonWithPhotoUrl(d);
}

export async function deactivateDoctor(
  hospitalId: string,
  id: string,
  actorUserId: string,
) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!d) throw NotFound("Doctor not found");
  if (d.deactivatedAt) return toJsonWithPhotoUrl(d);
  d.deactivatedAt = new Date();
  await d.save();

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "doctor.deactivated",
    entityType: "Doctor",
    entityId: d.id,
  });

  return toJsonWithPhotoUrl(d);
}

export async function reactivateDoctor(
  hospitalId: string,
  id: string,
  actorUserId: string,
) {
  const d = await Doctor.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!d) throw NotFound("Doctor not found");
  if (!d.deactivatedAt) return toJsonWithPhotoUrl(d);
  d.deactivatedAt = null;
  await d.save();

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "doctor.reactivated",
    entityType: "Doctor",
    entityId: d.id,
  });

  return toJsonWithPhotoUrl(d);
}
