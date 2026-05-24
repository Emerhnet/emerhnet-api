import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(120),
  headDoctorId: objectId.nullable().optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  headDoctorId: objectId.nullable().optional(),
  active: z.boolean().optional(),
});
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const listDepartmentsSchema = z.object({
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
});
