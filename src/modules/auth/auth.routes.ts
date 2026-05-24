import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "./auth.controller";
import { requireAuth } from "../../middleware/auth";

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.get("/csrf", (_req, res) => {
  res.json({ csrfToken: res.locals.csrfToken });
});
authRouter.post("/sign-in", signInLimiter, controller.postSignIn);
authRouter.post("/refresh", controller.postRefresh);
authRouter.post("/sign-out", controller.postSignOut);
authRouter.get("/me", requireAuth, controller.getMe);
authRouter.post(
  "/forgot-password",
  forgotLimiter,
  controller.postForgotPassword,
);
authRouter.post("/reset-password", controller.postResetPassword);
