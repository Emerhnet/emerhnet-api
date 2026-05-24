import type { Request, Response, NextFunction } from 'express';
import {
  registerHospitalSchema,
  reviewHospitalSchema,
  listHospitalsSchema,
  updateMyHospitalSchema,
  addPhotoSchema,
} from './hospital.schemas';
import * as service from './hospital.service';
import { Forbidden, ValidationError } from '../../shared/errors';

export async function postRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerHospitalSchema.parse(req.body);
    const result = await service.registerHospital(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listHospitalsSchema.parse(req.query);
    const result = await service.listHospitals(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const hospital = await service.getHospital(req.params.id!);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function patchApprove(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Forbidden();
    const { notes } = reviewHospitalSchema.parse(req.body);
    const hospital = await service.approveHospital(req.params.id!, req.user.userId, notes);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function patchReject(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Forbidden();
    const { notes } = reviewHospitalSchema.parse(req.body);
    const hospital = await service.rejectHospital(req.params.id!, req.user.userId, notes);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function patchSuspend(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Forbidden();
    const { notes } = reviewHospitalSchema.parse(req.body);
    const hospital = await service.suspendHospital(req.params.id!, req.user.userId, notes);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function patchReactivate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw Forbidden();
    const hospital = await service.reactivateHospital(req.params.id!, req.user.userId);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function getMyHospital(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const hospital = await service.getMyHospital(req.user.hospitalId);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function patchMyHospital(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const input = updateMyHospitalSchema.parse(req.body);
    const hospital = await service.updateMyHospital(req.user.hospitalId, input, req.user.userId);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function postMyPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const input = addPhotoSchema.parse(req.body);
    const hospital = await service.addHospitalPhoto(req.user.hospitalId, input, req.user.userId);
    res.status(201).json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function deleteMyPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.hospitalId) throw Forbidden();
    const s3Key = typeof req.query.key === 'string' ? req.query.key : '';
    if (!s3Key) throw ValidationError('Missing photo key');
    const hospital = await service.deleteHospitalPhoto(req.user.hospitalId, s3Key, req.user.userId);
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function getDocumentUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, slotKey } = req.params as { id: string; slotKey: string };
    const url = await service.getHospitalDocumentUrl(id, slotKey);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}
