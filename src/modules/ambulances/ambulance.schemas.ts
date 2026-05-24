import { z } from "zod";

const phoneRegex = /^[+\d][\d\s-]{7,20}$/;

const AMB_TYPES = [
  "BLS",
  "ALS",
  "ICU",
  "Neonatal",
  "Patient Transport",
] as const;
const AMB_STATUSES = [
  "Available",
  "On Duty",
  "Under Maintenance",
  "Out of Service",
] as const;

export const createAmbulanceSchema = z.object({
  vehicleNumber: z.string().min(1).max(30),
  type: z.enum(AMB_TYPES),
  driverName: z.string().min(2),
  driverPhone: z.string().regex(phoneRegex),
  equipment: z.array(z.string().min(1)).default([]),
  status: z.enum(AMB_STATUSES).default("Available"),
});
export type CreateAmbulanceInput = z.infer<typeof createAmbulanceSchema>;

export const updateAmbulanceSchema = createAmbulanceSchema.partial();
export type UpdateAmbulanceInput = z.infer<typeof updateAmbulanceSchema>;

export const listAmbulancesSchema = z.object({
  search: z.string().optional(),
  type: z.enum(AMB_TYPES).optional(),
  status: z.enum(AMB_STATUSES).optional(),
});
