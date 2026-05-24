import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./audit-log.controller";

export const auditLogRouter = Router();
auditLogRouter.use(requireAuth, requireRole("superAdmin", "hospitalAdmin"));
auditLogRouter.get("/", controller.getList);
