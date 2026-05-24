import { Hospital } from '../hospitals/hospital.model';
import { Doctor } from '../doctors/doctor.model';
import { Department } from '../departments/department.model';
import { Bed } from '../beds/bed.model';
import { Ambulance } from '../ambulances/ambulance.model';
import { listAuditLog } from '../audit-log/audit-log.service';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'object') s = JSON.stringify(value);
  else s = String(value);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(csvEscape).join(',');
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  return body ? `${head}\n${body}\n` : `${head}\n`;
}

export async function exportHospitalsCsv(): Promise<string> {
  const docs = await Hospital.find().sort({ createdAt: -1 }).lean();
  const headers = [
    'Tracking ID', 'Hospital Name', 'NIN', 'Category', 'Status',
    'CGHS', 'Ayushman', 'City', 'State', 'Pincode',
    'Admin Name', 'Admin Email', 'Admin Phone', 'Created At', 'Approved At',
  ];
  const rows = docs.map((h) => [
    h.trackingId, h.hospitalName, h.nin, h.category, h.status,
    h.cghsEmpanelment ? 'Yes' : 'No', h.ayushmanEmpanelment ? 'Yes' : 'No',
    h.address.city, h.address.state, h.address.pincode,
    h.adminContact.name, h.adminContact.email, h.adminContact.phone,
    h.createdAt, h.approvedAt,
  ]);
  return rowsToCsv(headers, rows);
}

export async function exportDoctorsCsv(hospitalId: string): Promise<string> {
  const [docs, departments] = await Promise.all([
    Doctor.find({ hospitalId }).sort({ fullName: 1 }).lean(),
    Department.find({ hospitalId }).select('name').lean(),
  ]);
  const deptMap = new Map(departments.map((d) => [String(d._id), d.name]));
  const headers = [
    'Full Name', 'Council Reg', 'Council', 'Department', 'Specialisation',
    'Qualifications', 'Email', 'Phone', 'Gender', 'Joined At', 'Status',
  ];
  const rows = docs.map((d) => [
    d.fullName, d.councilReg, d.council,
    deptMap.get(String(d.departmentId)) ?? '',
    d.specialisation, d.qualifications.join('; '),
    d.email, d.phone, d.gender,
    d.joinedAt, d.deactivatedAt ? 'Deactivated' : 'Active',
  ]);
  return rowsToCsv(headers, rows);
}

export async function exportDepartmentsCsv(hospitalId: string): Promise<string> {
  const docs = await Department.find({ hospitalId }).sort({ name: 1 }).lean();
  const headers = ['Name', 'Active', 'Created At'];
  const rows = docs.map((d) => [d.name, d.active ? 'Yes' : 'No', d.createdAt]);
  return rowsToCsv(headers, rows);
}

export async function exportBedsCsv(hospitalId: string): Promise<string> {
  const docs = await Bed.find({ hospitalId }).sort({ type: 1 }).lean();
  const headers = ['Type', 'Total', 'Occupied', 'Available', 'Last Updated'];
  const rows = docs.map((b) => [b.type, b.total, b.occupied, b.total - b.occupied, b.updatedAt]);
  return rowsToCsv(headers, rows);
}

export async function exportAmbulancesCsv(hospitalId: string): Promise<string> {
  const docs = await Ambulance.find({ hospitalId }).sort({ vehicleNumber: 1 }).lean();
  const headers = [
    'Vehicle Number', 'Type', 'Driver Name', 'Driver Phone',
    'Equipment', 'Status', 'Updated At',
  ];
  const rows = docs.map((a) => [
    a.vehicleNumber, a.type, a.driverName, a.driverPhone,
    a.equipment.join('; '), a.status, a.updatedAt,
  ]);
  return rowsToCsv(headers, rows);
}

export async function exportAuditLogCsv(scopeHospitalId?: string): Promise<string> {
  const result = await listAuditLog({
    page: 1,
    pageSize: 10000,
    scopeHospitalId,
  });
  const headers = [
    'Timestamp', 'Action', 'Actor', 'Actor Role', 'Actor Email',
    'Hospital', 'Entity Type', 'Entity ID', 'IP', 'User Agent', 'Before', 'After',
  ];
  const rows = result.items.map((r) => [
    r.createdAt, r.action, r.actorName, r.actorRole, r.actorEmail,
    r.hospitalName ?? '', r.entityType ?? '', r.entityId ?? '',
    r.ip ?? '', r.userAgent ?? '', r.before, r.after,
  ]);
  return rowsToCsv(headers, rows);
}
