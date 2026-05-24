import type { Request, Response, NextFunction } from 'express';
import { listAuditSchema } from './audit-log.schemas';
import * as service from './audit-log.service';
import { Unauthorized } from '../../shared/errors';

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Unauthorized();
    const q = listAuditSchema.parse(req.query);
    const scopeHospitalId = req.user.role === 'hospitalAdmin' ? req.user.hospitalId : undefined;
    res.json(await service.listAuditLog({ ...q, scopeHospitalId }));
  } catch (err) {
    next(err);
  }
}
