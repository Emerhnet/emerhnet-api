import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");
const phoneRegex = /^[+\d][\d\s-]{7,20}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const slotSchema = z.object({
  from: z.string().regex(timeRegex, "Invalid time (HH:mm)"),
  to: z.string().regex(timeRegex, "Invalid time (HH:mm)"),
});
const daySchema = z.object({
  off: z.boolean().default(false),
  slots: z.array(slotSchema).default([]),
});
const scheduleSchema = z.object({
  Mon: daySchema,
  Tue: daySchema,
  Wed: daySchema,
  Thu: daySchema,
  Fri: daySchema,
  Sat: daySchema,
  Sun: daySchema,
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const createDoctorSchema = z.object({
  fullName: z.string().min(2),
  councilReg: z.string().min(1),
  council: z.string().min(1),
  departmentId: objectId,
  specialisation: z.string().optional().default(""),
  qualifications: z.array(z.string().min(1)).default([]),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(phoneRegex),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  dob: z.string().optional(),
  joinedAt: z.string().min(1),
  opdRoom: z.string().optional().default(""),
  photoS3Key: z.string().nullable().optional(),
  dutyStatus: z.enum(["active", "on_leave", "off_duty"]).optional(),
  consultationSchedule: scheduleSchema.nullable().optional(),
});
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = createDoctorSchema.partial();
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const setDutyStatusSchema = z.object({
  dutyStatus: z.enum(["active", "on_leave", "off_duty"]),
});
export type SetDutyStatusInput = z.infer<typeof setDutyStatusSchema>;

export const listDoctorsSchema = z.object({
  search: z.string().optional(),
  departmentId: objectId.optional(),
  status: z.enum(["active", "deactivated"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
