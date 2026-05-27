import { z } from "zod";
import { BLOOD_GROUPS } from "./bloodbank.model";

export const createBloodStockSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS),
  unitsAvailable: z.number().int().min(0).default(0),
  criticalThreshold: z.number().int().min(0).default(5),
});
export type CreateBloodStockInput = z.infer<typeof createBloodStockSchema>;

export const updateBloodStockSchema = z.object({
  unitsAvailable: z.number().int().min(0).optional(),
  criticalThreshold: z.number().int().min(0).optional(),
});
export type UpdateBloodStockInput = z.infer<typeof updateBloodStockSchema>;
