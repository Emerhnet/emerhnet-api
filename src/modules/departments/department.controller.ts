import type { Request, Response, NextFunction } from "express";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentsSchema,
} from "./department.schemas";
import * as service from "./department.service";
import { Forbidden } from "../../shared/errors";

function ctx(req: Request) {
  if (!req.user?.hospitalId) throw Forbidden();
  return { hospitalId: req.user.hospitalId, userId: req.user.userId };
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId } = ctx(req);
    const q = listDepartmentsSchema.parse(req.query);
    res.json({ items: await service.listDepartments(hospitalId, q) });
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
    const input = createDepartmentSchema.parse(req.body);
    res
      .status(201)
      .json(await service.createDepartment(hospitalId, input, userId));
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
    const input = updateDepartmentSchema.parse(req.body);
    res.json(
      await service.updateDepartment(hospitalId, req.params.id!, input, userId),
    );
  } catch (err) {
    next(err);
  }
}

export async function deleteOne(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { hospitalId, userId } = ctx(req);
    await service.deleteDepartment(hospitalId, req.params.id!, userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
