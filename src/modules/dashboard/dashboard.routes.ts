import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./dashboard.controller";

export const dashboardRouter = Router();

const superAdmin = Router();
superAdmin.use(requireAuth, requireRole("superAdmin"));
superAdmin.get("/", controller.getSuperAdmin);
dashboardRouter.use("/super-admin", superAdmin);

const hospitalAdmin = Router();
hospitalAdmin.use(requireAuth, requireRole("hospitalAdmin"));
hospitalAdmin.get("/", controller.getHospitalAdmin);
dashboardRouter.use("/hospital", hospitalAdmin);
