import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { uploadFileToS3 } from "./upload.service";
import { AppError } from "../../shared/errors";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "Only PDF and image files are allowed.",
        ),
      );
    }
  },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMITED",
    message: "Too many uploads. Try again later.",
  },
});

export const uploadRouter = Router();

uploadRouter.post(
  "/",
  uploadLimiter,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError(400, "VALIDATION_ERROR", "No file provided.");
      }

      const key = await uploadFileToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      res.status(201).json({
        key,
        fileName: req.file.originalname,
        sizeBytes: req.file.size,
      });
    } catch (err) {
      next(err);
    }
  },
);
