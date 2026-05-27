import type { Request, Response, NextFunction } from "express";
import {
  createBloodStockSchema,
  updateBloodStockSchema,
} from "./bloodbank.schemas";
import * as service from "./bloodbank.service";
import { Forbidden } from "../../shared/errors";

function ctx(req: Request) {
  if (!req.user?.hospitalId) throw Forbidden();
  return { hospitalId: req.user.hospitalId, userId: req.user.userId };
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId } = ctx(req);
    res.json(await service.listBloodStock(hospitalId));
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
    const input = createBloodStockSchema.parse(req.body);
    res.status(201).json(await service.createBloodStock(hospitalId, input, userId));
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
    const input = updateBloodStockSchema.parse(req.body);
    res.json(
      await service.updateBloodStock(hospitalId, req.params.id!, input, userId),
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
    await service.deleteBloodStock(hospitalId, req.params.id!, userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
