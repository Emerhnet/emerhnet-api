import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "up" : "down",
    timestamp: new Date().toISOString(),
  });
});
