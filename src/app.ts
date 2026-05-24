import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./shared/logger";
import { csrf } from "./middleware/csrf";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { hospitalsRouter } from "./modules/hospitals/hospital.routes";
import { uploadRouter } from "./modules/upload/upload.routes";
import { invitationsRouter } from "./modules/invitations/invitation.routes";
import { departmentsRouter } from "./modules/departments/department.routes";
import { doctorsRouter } from "./modules/doctors/doctor.routes";
import { bedsRouter } from "./modules/beds/bed.routes";
import { ambulancesRouter } from "./modules/ambulances/ambulance.routes";
import { auditLogRouter } from "./modules/audit-log/audit-log.routes";
import { exportsRouter } from "./modules/exports/exports.routes";
import { openapiRouter } from "./openapi/openapi.routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customSuccessMessage: (req, res, time) =>
        `${req.method} ${req.url} ${res.statusCode} (${time}ms)`,
      customErrorMessage: (req, res, err) =>
        `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
      autoLogging: { ignore: (req) => req.url === "/api/v1/health" },
    }),
  );

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(csrf);

  const api = express.Router();
  api.use(healthRouter);
  api.use(openapiRouter);
  api.use("/auth", authRouter);
  api.use("/hospitals", hospitalsRouter);
  api.use("/upload", uploadRouter);
  api.use("/invitations", invitationsRouter);
  api.use("/departments", departmentsRouter);
  api.use("/doctors", doctorsRouter);
  api.use("/beds", bedsRouter);
  api.use("/ambulances", ambulancesRouter);
  api.use("/audit-log", auditLogRouter);
  api.use("/exports", exportsRouter);

  app.use(env.API_PREFIX, api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
