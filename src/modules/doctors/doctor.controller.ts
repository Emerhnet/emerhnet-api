import type { Request, Response, NextFunction } from "express";
import {
  createDoctorSchema,
  updateDoctorSchema,
  listDoctorsSchema,
  setDutyStatusSchema,
} from "./doctor.schemas";
import * as service from "./doctor.service";
import { Forbidden } from "../../shared/errors";

function ctx(req: Request) {
  if (!req.user?.hospitalId) throw Forbidden();
  return { hospitalId: req.user.hospitalId, userId: req.user.userId };
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId } = ctx(req);
    const q = listDoctorsSchema.parse(req.query);
    res.json(await service.listDoctors(hospitalId, q));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId } = ctx(req);
    res.json(await service.getDoctor(hospitalId, req.params.id!));
  } catch (err) {
    next(err);
  }
}

export async function postCreate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { hospitalId, userId } = ctx(req);
    const input = createDoctorSchema.parse(req.body);
    res.status(201).json(await service.createDoctor(hospitalId, input, userId));
  } catch (err) {
    next(err);
  }
}

export async function patchOne(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { hospitalId, userId } = ctx(req);
    const input = updateDoctorSchema.parse(req.body);
    res.json(
      await service.updateDoctor(hospitalId, req.params.id!, input, userId),
    );
  } catch (err) {
    next(err);
  }
}

export async function postDeactivate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { hospitalId, userId } = ctx(req);
    res.json(
      await service.deactivateDoctor(hospitalId, req.params.id!, userId),
    );
  } catch (err) {
    next(err);
  }
}

export async function postSetDutyStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { hospitalId, userId } = ctx(req);
    const input = setDutyStatusSchema.parse(req.body);
    res.json(
      await service.setDutyStatus(hospitalId, req.params.id!, input, userId),
    );
  } catch (err) {
    next(err);
  }
}

export async function postReactivate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { hospitalId, userId } = ctx(req);
    res.json(
      await service.reactivateDoctor(hospitalId, req.params.id!, userId),
    );
  } catch (err) {
    next(err);
  }
}
