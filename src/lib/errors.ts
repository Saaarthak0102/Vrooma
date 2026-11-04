export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INCOMPLETE_PROFILE"
  | "ACCOUNT_DISABLED"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "RATE_LIMITED"
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "USER_BANNED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export interface ErrorFields {
  [field: string]: string[] | string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly fields?: ErrorFields;

  get statusCode(): number {
    return this.httpStatus;
  }

  constructor(
    code: ErrorCode,
    httpStatus: number,
    message: string,
    fields?: ErrorFields
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.fields = fields;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export type ActionResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fields?: ErrorFields } };

export function successResponse<T>(data: T): ActionResponse<T> {
  return { ok: true, data };
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  fields?: ErrorFields
): ActionResponse<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      fields,
    },
  };
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  let message = "";
  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "object" && err !== null && "message" in err) {
    message = String((err as any).message);
  } else {
    message = String(err);
  }

  const lower = message.toLowerCase();

  // Map known Supabase Auth errors
  if (lower.includes("rate limit") || lower.includes("over_email_send_rate_limit")) {
    return new AppError("RATE_LIMITED", 429, "Too many requests. Please wait a moment before trying again.");
  }
  if (lower.includes("expired") || lower.includes("otp_expired")) {
    return new AppError("CODE_EXPIRED", 400, "Verification code has expired. Please request a new code.");
  }
  if (lower.includes("invalid") || lower.includes("invalid_grant") || lower.includes("token")) {
    return new AppError("INVALID_CODE", 400, "Invalid verification code. Please check and try again.");
  }
  if (lower.includes("disabled") || lower.includes("user_banned") || lower.includes("banned")) {
    return new AppError("ACCOUNT_DISABLED", 403, "This account has been disabled. Please contact dealership administration.");
  }

  return new AppError("INTERNAL_ERROR", 500, message || "An unexpected error occurred. Please try again.");
}
