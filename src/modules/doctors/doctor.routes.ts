import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./doctor.controller";

export const doctorsRouter = Router();
doctorsRouter.use(requireAuth, requireRole("hospitalAdmin"));

doctorsRouter.get("/", controller.getList);
doctorsRouter.post("/", controller.postCreate);
doctorsRouter.get("/:id", controller.getOne);
doctorsRouter.patch("/:id", controller.patchOne);
doctorsRouter.post("/:id/deactivate", controller.postDeactivate);
doctorsRouter.post("/:id/reactivate", controller.postReactivate);
