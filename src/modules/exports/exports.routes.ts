import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./exports.controller";

export const exportsRouter = Router();

// Super admin only
const superAdmin = Router();
superAdmin.use(requireAuth, requireRole("superAdmin"));
superAdmin.get("/hospitals.csv", controller.getHospitalsCsv);
exportsRouter.use(superAdmin);

// Hospital admin only
const hospitalAdmin = Router();
hospitalAdmin.use(requireAuth, requireRole("hospitalAdmin"));
hospitalAdmin.get("/doctors.csv", controller.getDoctorsCsv);
hospitalAdmin.get("/departments.csv", controller.getDepartmentsCsv);
hospitalAdmin.get("/beds.csv", controller.getBedsCsv);
hospitalAdmin.get("/ambulances.csv", controller.getAmbulancesCsv);
exportsRouter.use(hospitalAdmin);

// Both roles (scope auto-derived)
const both = Router();
both.use(requireAuth, requireRole("superAdmin", "hospitalAdmin"));
both.get("/audit-log.csv", controller.getAuditLogCsv);
exportsRouter.use(both);
