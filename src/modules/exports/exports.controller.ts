import type { Request, Response, NextFunction } from 'express';
import * as service from './exports.service';
import { Forbidden } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';

function sendCsv(res: Response, filename: string, body: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(body);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getHospitalsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Forbidden();
    const body = await service.exportHospitalsCsv();
    await writeAudit({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: 'export.hospitals',
    });
    sendCsv(res, `hospitals-${dateStamp()}.csv`, body);
  } catch (err) {
    next(err);
  }
}

export async function getDoctorsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const body = await service.exportDoctorsCsv(req.user.hospitalId);
    await writeAudit({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      hospitalId: req.user.hospitalId,
      action: 'export.doctors',
    });
    sendCsv(res, `doctors-${dateStamp()}.csv`, body);
  } catch (err) {
    next(err);
  }
}

export async function getDepartmentsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const body = await service.exportDepartmentsCsv(req.user.hospitalId);
    await writeAudit({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      hospitalId: req.user.hospitalId,
      action: 'export.departments',
    });
    sendCsv(res, `departments-${dateStamp()}.csv`, body);
  } catch (err) {
    next(err);
  }
}

export async function getBedsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const body = await service.exportBedsCsv(req.user.hospitalId);
    await writeAudit({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      hospitalId: req.user.hospitalId,
      action: 'export.beds',
    });
    sendCsv(res, `beds-${dateStamp()}.csv`, body);
  } catch (err) {
    next(err);
  }
}

export async function getAmbulancesCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const body = await service.exportAmbulancesCsv(req.user.hospitalId);
    await writeAudit({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      hospitalId: req.user.hospitalId,
      action: 'export.ambulances',
    });
    sendCsv(res, `ambulances-${dateStamp()}.csv`, body);
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Forbidden();
    const scope = req.user.role === 'hospitalAdmin' ? req.user.hospitalId : undefined;
    const body = await service.exportAuditLogCsv(scope);
    await writeAudit({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      hospitalId: scope ?? null,
      action: 'export.audit_log',
    });
    sendCsv(res, `audit-log-${dateStamp()}.csv`, body);
  } catch (err) {
    next(err);
  }
}
