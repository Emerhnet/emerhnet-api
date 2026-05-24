import type { Request, Response, NextFunction } from 'express';
import { createBedSchema, updateBedSchema } from './bed.schemas';
import * as service from './bed.service';
import { Forbidden } from '../../shared/errors';

function ctx(req: Request) {
  if (!req.user?.hospitalId) throw Forbidden();
  return { hospitalId: req.user.hospitalId, userId: req.user.userId };
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId } = ctx(req);
    res.json(await service.listBeds(hospitalId));
  } catch (err) {
    next(err);
  }
}

export async function postCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId, userId } = ctx(req);
    const input = createBedSchema.parse(req.body);
    res.status(201).json(await service.createBed(hospitalId, input, userId));
  } catch (err) {
    next(err);
  }
}

export async function patchOne(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId, userId } = ctx(req);
    const input = updateBedSchema.parse(req.body);
    res.json(await service.updateBed(hospitalId, req.params.id!, input, userId));
  } catch (err) {
    next(err);
  }
}

export async function deleteOne(req: Request, res: Response, next: NextFunction) {
  try {
    const { hospitalId, userId } = ctx(req);
    await service.deleteBed(hospitalId, req.params.id!, userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
