import type { Request, Response, NextFunction } from "express";
import * as service from "./dashboard.service";
import { Forbidden } from "../../shared/errors";

export async function getSuperAdmin(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json(await service.getSuperAdminDashboard());
  } catch (err) {
    next(err);
  }
}

export async function getHospitalAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    res.json(await service.getHospitalAdminDashboard(req.user.hospitalId));
  } catch (err) {
    next(err);
  }
}
