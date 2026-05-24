import type { Request, Response, NextFunction } from "express";
import {
  createAmbulanceSchema,
  updateAmbulanceSchema,
  listAmbulancesSchema,
} from "./ambulance.schemas";
import * as service from "./ambulance.service";
import { Forbidden } from "../../shared/errors";

function ctx(req: Request) {
  if (!req.user?.hospitalId) throw Forbidden();
  return { hospitalId: req.user.hospitalId, userId: req.user.userId };
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId } = ctx(req);
    const q = listAmbulancesSchema.parse(req.query);
    res.json(await service.listAmbulances(hospitalId, q));
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
    const input = createAmbulanceSchema.parse(req.body);
    res
      .status(201)
      .json(await service.createAmbulance(hospitalId, input, userId));
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
    const input = updateAmbulanceSchema.parse(req.body);
    res.json(
      await service.updateAmbulance(hospitalId, req.params.id!, input, userId),
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
    await service.deleteAmbulance(hospitalId, req.params.id!, userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
