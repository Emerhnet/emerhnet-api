import { Types } from "mongoose";
import { AuditLog } from "../../shared/audit";
import { User } from "../auth/user.model";
import { Hospital } from "../hospitals/hospital.model";
import type { ListAuditInput } from "./audit-log.schemas";

function hid(s: string) {
  return new Types.ObjectId(s);
}

export interface AuditLogResponseRow {
  id: string;
  action: string;
  actorUserId: string | null;
  actorRole: string;
  actorName: string;
  actorEmail: string;
  hospitalId: string | null;
  hospitalName: string | null;
  entityType: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ListAuditOptions extends ListAuditInput {
  scopeHospitalId?: string;
}

export async function listAuditLog(opts: ListAuditOptions) {
  const filter: Record<string, unknown> = {};

  if (opts.scopeHospitalId) {
    filter.hospitalId = hid(opts.scopeHospitalId);
  } else if (opts.hospitalId) {
    filter.hospitalId = hid(opts.hospitalId);
  }

  if (opts.actorUserId) filter.actorUserId = hid(opts.actorUserId);
  if (opts.entityType) filter.entityType = opts.entityType;
  if (opts.ip)
    filter.ip = new RegExp(opts.ip.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const actionList = opts.actions
    ? opts.actions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : opts.action
      ? [opts.action]
      : [];
  if (actionList.length > 0) {
    filter.action = { $in: actionList };
  }

  if (opts.search) {
    const re = new RegExp(
      opts.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ action: re }, { entityType: re }, { entityId: re }];
  }

  if (opts.from || opts.to) {
    const dateFilter: Record<string, Date> = {};
    if (opts.from) dateFilter.$gte = new Date(opts.from);
    if (opts.to) dateFilter.$lte = new Date(opts.to + "T23:59:59Z");
    filter.createdAt = dateFilter;
  }

  const [docs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const userIds = Array.from(
    new Set(
      docs
        .map((d) => d.actorUserId && String(d.actorUserId))
        .filter(Boolean) as string[],
    ),
  );
  const hospitalIds = Array.from(
    new Set(
      docs
        .map((d) => d.hospitalId && String(d.hospitalId))
        .filter(Boolean) as string[],
    ),
  );

  const [users, hospitals] = await Promise.all([
    userIds.length
      ? User.find({ _id: { $in: userIds } })
          .select("fullName email")
          .lean()
      : Promise.resolve([]),
    hospitalIds.length
      ? Hospital.find({ _id: { $in: hospitalIds } })
          .select("hospitalName")
          .lean()
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const hospitalMap = new Map(
    hospitals.map((h) => [String(h._id), h.hospitalName]),
  );

  const items: AuditLogResponseRow[] = docs.map((d) => {
    const actorUserId = d.actorUserId ? String(d.actorUserId) : null;
    const user = actorUserId ? userMap.get(actorUserId) : undefined;
    const hospitalId = d.hospitalId ? String(d.hospitalId) : null;
    return {
      id: String(d._id),
      action: d.action,
      actorUserId,
      actorRole: d.actorRole ?? "anonymous",
      actorName:
        user?.fullName ??
        (d.actorRole === "anonymous" ? "Anonymous" : "System"),
      actorEmail: user?.email ?? "",
      hospitalId,
      hospitalName: hospitalId ? (hospitalMap.get(hospitalId) ?? null) : null,
      entityType: d.entityType ?? null,
      entityId: d.entityId ?? null,
      before: d.before ?? null,
      after: d.after ?? null,
      ip: d.ip ?? null,
      userAgent: d.userAgent ?? null,
      createdAt: d.createdAt.toISOString(),
    };
  });

  return { items, total, page: opts.page, pageSize: opts.pageSize };
}
