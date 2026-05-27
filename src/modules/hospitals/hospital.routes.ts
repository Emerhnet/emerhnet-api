import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./hospital.controller";

export const hospitalsRouter = Router();

// Public
hospitalsRouter.post("/register", controller.postRegister);

// Hospital admin group (must come before /:id super-admin routes so /me doesn't collide)
const hospitalAdmin = Router();
hospitalAdmin.use(requireAuth, requireRole("hospitalAdmin"));
hospitalAdmin.get("/", controller.getMyHospital);
hospitalAdmin.patch("/", controller.patchMyHospital);
hospitalAdmin.post("/photos", controller.postMyPhoto);
hospitalAdmin.delete("/photos", controller.deleteMyPhoto);
hospitalsRouter.use("/me", hospitalAdmin);

// Super admin group
const superAdmin = Router();
superAdmin.use(requireAuth, requireRole("superAdmin"));

superAdmin.get("/", controller.getList);
superAdmin.get("/:id", controller.getOne);
superAdmin.get("/:id/doctors", controller.getDoctorsForHospital);
superAdmin.get("/:id/departments", controller.getDepartmentsForHospital);
superAdmin.get("/:id/beds", controller.getBedsForHospital);
superAdmin.get("/:id/ambulances", controller.getAmbulancesForHospital);
superAdmin.get("/:id/bloodbank", controller.getBloodBankForHospital);
superAdmin.get("/:id/documents/:slotKey/url", controller.getDocumentUrl);
superAdmin.patch("/:id/approve", controller.patchApprove);
superAdmin.patch("/:id/reject", controller.patchReject);
superAdmin.patch("/:id/suspend", controller.patchSuspend);
superAdmin.patch("/:id/reactivate", controller.patchReactivate);

hospitalsRouter.use(superAdmin);
