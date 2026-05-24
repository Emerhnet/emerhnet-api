export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ApiErrorBody {
  success: false;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Unauthorized = (msg = "Authentication required") =>
  new AppError(401, "UNAUTHORIZED", msg);
export const Forbidden = (msg = "You do not have access to this resource") =>
  new AppError(403, "FORBIDDEN", msg);
export const NotFound = (msg = "Resource not found") =>
  new AppError(404, "NOT_FOUND", msg);
export const Conflict = (msg: string, details?: unknown) =>
  new AppError(409, "CONFLICT", msg, details);
export const ValidationError = (msg: string, details?: unknown) =>
  new AppError(400, "VALIDATION_ERROR", msg, details);
