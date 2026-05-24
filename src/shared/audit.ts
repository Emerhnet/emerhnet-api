import { Schema, model, Types } from "mongoose";
import type { Role } from "../middleware/auth";
import { logger } from "./logger";

export type AuditAction =
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "auth.refresh"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "auth.account_locked"
  | string;

interface AuditLogDoc {
  actorUserId?: Types.ObjectId | null;
  actorRole?: Role | "anonymous";
  hospitalId?: Types.ObjectId | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditSchema = new Schema<AuditLogDoc>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: { type: String },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
      index: true,
    },
    action: { type: String, required: true, index: true },
    entityType: String,
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  { versionKey: false },
);

export const AuditLog = model<AuditLogDoc>("AuditLog", auditSchema);

export interface AuditInput {
  actorUserId?: string | null;
  actorRole?: Role | "anonymous";
  hospitalId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      actorUserId: input.actorUserId
        ? new Types.ObjectId(input.actorUserId)
        : null,
      actorRole: input.actorRole ?? "anonymous",
      hospitalId: input.hospitalId
        ? new Types.ObjectId(input.hospitalId)
        : null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      ip: input.ip,
      userAgent: input.userAgent,
      createdAt: new Date(),
    });
  } catch (err) {
    logger.error({ err, action: input.action }, "audit write failed");
  }
}
