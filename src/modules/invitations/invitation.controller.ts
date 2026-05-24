import type { Request, Response, NextFunction } from "express";
import {
  createInvitationSchema,
  listInvitationsSchema,
} from "./invitation.schemas";
import * as service from "./invitation.service";
import { Forbidden, ValidationError } from "../../shared/errors";

export async function postCreate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw Forbidden();
    const input = createInvitationSchema.parse(req.body);
    const result = await service.createInvitation(input, req.user.userId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listInvitationsSchema.parse(req.query);
    const result = await service.listInvitations(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postReissue(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw Forbidden();
    const result = await service.reissueInvitation(
      req.params.id!,
      req.user.userId,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postCancel(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw Forbidden();
    const invitation = await service.cancelInvitation(
      req.params.id!,
      req.user.userId,
    );
    res.json(invitation);
  } catch (err) {
    next(err);
  }
}

export async function getVerify(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.params.token;
    if (!token) throw ValidationError("Missing invitation token");
    const result = await service.verifyInvitation(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
