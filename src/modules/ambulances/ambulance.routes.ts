import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./ambulance.controller";

export const ambulancesRouter = Router();
ambulancesRouter.use(requireAuth, requireRole("hospitalAdmin"));

ambulancesRouter.get("/", controller.getList);
ambulancesRouter.post("/", controller.postCreate);
ambulancesRouter.patch("/:id", controller.patchOne);
ambulancesRouter.delete("/:id", controller.deleteOne);
