import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import * as controller from "./bloodbank.controller";

export const bloodbankRouter = Router();
bloodbankRouter.use(requireAuth, requireRole("hospitalAdmin"));

bloodbankRouter.get("/", controller.getList);
bloodbankRouter.post("/", controller.postCreate);
bloodbankRouter.patch("/:id", controller.patchOne);
bloodbankRouter.delete("/:id", controller.deleteOne);
