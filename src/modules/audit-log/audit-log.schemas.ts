import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

export const listAuditSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  actions: z.string().optional(), // comma-separated
  actorUserId: objectId.optional(),
  hospitalId: objectId.optional(),
  entityType: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  ip: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListAuditInput = z.infer<typeof listAuditSchema>;
