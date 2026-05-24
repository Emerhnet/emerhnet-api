import { z } from 'zod';

export const createBedSchema = z.object({
  type: z.string().min(1).max(60),
  total: z.number().int().min(0),
  occupied: z.number().int().min(0).default(0),
});
export type CreateBedInput = z.infer<typeof createBedSchema>;

export const updateBedSchema = z.object({
  type: z.string().min(1).max(60).optional(),
  total: z.number().int().min(0).optional(),
  occupied: z.number().int().min(0).optional(),
});
export type UpdateBedInput = z.infer<typeof updateBedSchema>;
