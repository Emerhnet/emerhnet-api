import { z } from "zod";

export const createInvitationSchema = z.object({
  hospitalName: z.string().min(2),
  recipientEmail: z.string().email().toLowerCase(),
  recipientRole: z.string().optional().default(""),
  internalNotes: z.string().optional().default(""),
  verificationNotes: z.string().min(1, "Verification notes are required"),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const listInvitationsSchema = z.object({
  status: z
    .enum(["sent", "opened", "submitted", "approved", "expired", "cancelled"])
    .optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});
