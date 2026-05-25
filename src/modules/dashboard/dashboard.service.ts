import { Types } from "mongoose";
import { Hospital } from "../hospitals/hospital.model";
import { Doctor } from "../doctors/doctor.model";
import { Ambulance } from "../ambulances/ambulance.model";
import { Bed } from "../beds/bed.model";
import { Department } from "../departments/department.model";
import { AuditLog } from "../../shared/audit";
import { User } from "../auth/user.model";

function hid(s: string) {
  return new Types.ObjectId(s);
}

export interface SuperAdminDashboard {
  kpis: {
    pendingRegistrations: number;
    approvedHospitals: number;
    totalDoctors: number;
    totalAmbulances: number;
  };
  statusBreakdown: {
    approved: number;
    pending: number;
    suspended: number;
    rejected: number;
  };
  pendingQueue: Array<{
    id: string;
    hospitalName: string;
    city: string;
    createdAt: string;
    source: "Self" | "Invited";
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string;
    createdAt: string;
    hospitalName: string | null;
    entityType: string | null;
  }>;
  rejectionsLast30d: Array<{ week: string; count: number }>;
}

export async function getSuperAdminDashboard(): Promise<SuperAdminDashboard> {
  const [
    pendingCount,
    approvedCount,
    suspendedCount,
    rejectedCount,
    totalDoctors,
    totalAmbulances,
    pendingDocs,
    invitations,
    recentAuditDocs,
    rejections30d,
  ] = await Promise.all([
    Hospital.countDocuments({ status: "pending" }),
    Hospital.countDocuments({ status: "approved" }),
    Hospital.countDocuments({ status: "suspended" }),
    Hospital.countDocuments({ status: "rejected" }),
    Doctor.countDocuments({ deactivatedAt: null }),
    Ambulance.countDocuments({}),
    Hospital.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    // Invited hospital tracking — those linked via invitation collection
    // To detect "Invited" source: any hospital with reviewNotes containing "invitation"
    // or use invitation collection. Simpler: invitation source flag missing — return Self for all.
    Promise.resolve([]),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(6).lean(),
    AuditLog.aggregate<{ _id: { week: number }; count: number }>([
      {
        $match: {
          action: "hospital.rejected",
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { week: { $week: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.week": 1 } },
    ]),
  ]);
  void invitations;

  // Hydrate audit rows w/ actor name + hospital name
  const actorIds = Array.from(
    new Set(
      recentAuditDocs
        .map((a) => a.actorUserId && String(a.actorUserId))
        .filter(Boolean) as string[],
    ),
  );
  const hospIds = Array.from(
    new Set(
      recentAuditDocs
        .map((a) => a.hospitalId && String(a.hospitalId))
        .filter(Boolean) as string[],
    ),
  );
  const [users, hospitals] = await Promise.all([
    actorIds.length
      ? User.find({ _id: { $in: actorIds } }).select("fullName").lean()
      : Promise.resolve([]),
    hospIds.length
      ? Hospital.find({ _id: { $in: hospIds } }).select("hospitalName").lean()
      : Promise.resolve([]),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u.fullName]));
  const hospMap = new Map(hospitals.map((h) => [String(h._id), h.hospitalName]));

  return {
    kpis: {
      pendingRegistrations: pendingCount,
      approvedHospitals: approvedCount,
      totalDoctors,
      totalAmbulances,
    },
    statusBreakdown: {
      approved: approvedCount,
      pending: pendingCount,
      suspended: suspendedCount,
      rejected: rejectedCount,
    },
    pendingQueue: pendingDocs.map((h) => ({
      id: String(h._id),
      hospitalName: h.hospitalName,
      city: h.address.city,
      createdAt: h.createdAt.toISOString(),
      source: "Self" as const,
    })),
    recentActivity: recentAuditDocs.map((a) => ({
      id: String(a._id),
      action: a.action,
      actorName: a.actorUserId
        ? userMap.get(String(a.actorUserId)) ?? "System"
        : "System",
      actorRole: a.actorRole ?? "anonymous",
      createdAt: a.createdAt.toISOString(),
      hospitalName: a.hospitalId ? hospMap.get(String(a.hospitalId)) ?? null : null,
      entityType: a.entityType ?? null,
    })),
    rejectionsLast30d: (rejections30d ?? []).map((r) => ({
      week: `Wk ${r._id.week}`,
      count: r.count,
    })),
  };
}

export interface HospitalAdminDashboard {
  hospital: { name: string; nin: string; status: string; updatedAt: string };
  kpis: {
    activeDoctors: number;
    departmentCount: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    totalAmbulances: number;
    availableAmbulances: number;
    onDutyAmbulances: number;
  };
  ambulanceStatus: {
    Available: number;
    "On Duty": number;
    "Under Maintenance": number;
    "Out of Service": number;
  };
  doctorsByDepartment: Array<{ name: string; count: number }>;
  bedTypes: Array<{ type: string; total: number; occupied: number }>;
}

export async function getHospitalAdminDashboard(
  hospitalId: string,
): Promise<HospitalAdminDashboard> {
  const oid = hid(hospitalId);
  const [hospital, departments, doctorAgg, beds, ambulances] = await Promise.all([
    Hospital.findById(oid).lean(),
    Department.find({ hospitalId: oid }).lean(),
    Doctor.aggregate<{ _id: Types.ObjectId; count: number; active: number }>([
      { $match: { hospitalId: oid } },
      {
        $group: {
          _id: "$departmentId",
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$deactivatedAt", null] }, 1, 0] },
          },
        },
      },
    ]),
    Bed.find({ hospitalId: oid }).lean(),
    Ambulance.find({ hospitalId: oid }).lean(),
  ]);

  if (!hospital) {
    return {
      hospital: { name: "", nin: "", status: "unknown", updatedAt: new Date().toISOString() },
      kpis: {
        activeDoctors: 0,
        departmentCount: 0,
        totalBeds: 0,
        occupiedBeds: 0,
        availableBeds: 0,
        totalAmbulances: 0,
        availableAmbulances: 0,
        onDutyAmbulances: 0,
      },
      ambulanceStatus: {
        Available: 0,
        "On Duty": 0,
        "Under Maintenance": 0,
        "Out of Service": 0,
      },
      doctorsByDepartment: [],
      bedTypes: [],
    };
  }

  const deptMap = new Map(departments.map((d) => [String(d._id), d.name]));
  const doctorsByDepartment = doctorAgg
    .map((g) => ({
      name: deptMap.get(String(g._id)) ?? "Unknown",
      count: g.active,
    }))
    .sort((a, b) => b.count - a.count);

  const activeDoctors = doctorAgg.reduce((s, g) => s + g.active, 0);
  const totalBeds = beds.reduce((s, b) => s + b.total, 0);
  const occupiedBeds = beds.reduce((s, b) => s + b.occupied, 0);

  const ambStatus = {
    Available: 0,
    "On Duty": 0,
    "Under Maintenance": 0,
    "Out of Service": 0,
  };
  ambulances.forEach((a) => {
    const s = a.status as keyof typeof ambStatus;
    if (s in ambStatus) ambStatus[s] = (ambStatus[s] ?? 0) + 1;
  });

  return {
    hospital: {
      name: hospital.hospitalName,
      nin: hospital.nin,
      status: hospital.status,
      updatedAt: hospital.updatedAt.toISOString(),
    },
    kpis: {
      activeDoctors,
      departmentCount: departments.filter((d) => d.active).length,
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      totalAmbulances: ambulances.length,
      availableAmbulances: ambStatus.Available,
      onDutyAmbulances: ambStatus["On Duty"],
    },
    ambulanceStatus: ambStatus,
    doctorsByDepartment,
    bedTypes: beds.map((b) => ({
      type: b.type,
      total: b.total,
      occupied: b.occupied,
    })),
  };
}
