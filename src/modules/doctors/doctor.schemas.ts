import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const phoneRegex = /^[+\d][\d\s-]{7,20}$/;

export const createDoctorSchema = z.object({
  fullName: z.string().min(2),
  councilReg: z.string().min(1),
  council: z.string().min(1),
  departmentId: objectId,
  specialisation: z.string().optional().default(''),
  qualifications: z.array(z.string().min(1)).default([]),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(phoneRegex),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  dob: z.string().optional(),
  joinedAt: z.string().min(1),
});
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = createDoctorSchema.partial();
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

export const listDoctorsSchema = z.object({
  search: z.string().optional(),
  departmentId: objectId.optional(),
  status: z.enum(['active', 'deactivated']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
