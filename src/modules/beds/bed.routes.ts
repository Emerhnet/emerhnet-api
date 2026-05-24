import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./bed.controller";

export const bedsRouter = Router();
bedsRouter.use(requireAuth, requireRole("hospitalAdmin"));

bedsRouter.get("/", controller.getList);
bedsRouter.post("/", controller.postCreate);
bedsRouter.patch("/:id", controller.patchOne);
bedsRouter.delete("/:id", controller.deleteOne);
