import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SECRET_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  ALLOW_DEV_LOGIN: z.string().optional().default("false"),
  RESEND_API_KEY: z.string().optional().default(""),
  AI_PROVIDER_API_KEY: z.string().optional().default(""),
  AI_MODEL_FAST: z.string().optional().default("claude-haiku-5-5"),
  AI_MODEL_SMART: z.string().optional().default("claude-sonnet-5-5"),
  AI_DAILY_CALL_CAP: z.coerce.number().int().positive().optional().default(5000),
  CRON_SECRET: z.string().optional().default(""),
  CALLS_WEBHOOK_SECRET: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const rawEnv = {
  APP_ENV: process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development"),
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
  SUPABASE_SECRET_KEY: secretKey,
  SUPABASE_SERVICE_ROLE_KEY: secretKey,
  ALLOW_DEV_LOGIN: process.env.ALLOW_DEV_LOGIN ?? "false",
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  AI_PROVIDER_API_KEY: process.env.AI_PROVIDER_API_KEY,
  AI_MODEL_FAST: process.env.AI_MODEL_FAST || undefined,
  AI_MODEL_SMART: process.env.AI_MODEL_SMART || undefined,
  AI_DAILY_CALL_CAP: process.env.AI_DAILY_CALL_CAP || undefined,
  CRON_SECRET: process.env.CRON_SECRET,
  CALLS_WEBHOOK_SECRET: process.env.CALLS_WEBHOOK_SECRET,
};

// Support SKIP_ENV_VALIDATION=1 for CI pipelines
const skipValidation = process.env.SKIP_ENV_VALIDATION === "1";
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

let parsedData: Env;

if (skipValidation) {
  parsedData = envSchema.parse({});
} else {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    if (isBuildPhase) {
      console.warn("⚠️ [env] Missing or non-fatal environment variables during build:", parsed.error.format());
    } else {
      console.warn("⚠️ [env] Invalid environment configuration:", parsed.error.format());
    }
    // Fallback gracefully without throwing at module load time
    parsedData = {
      APP_ENV: (rawEnv.APP_ENV as any) || "development",
      NEXT_PUBLIC_SITE_URL: rawEnv.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: rawEnv.NEXT_PUBLIC_SUPABASE_URL || "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
      SUPABASE_SECRET_KEY: secretKey,
      SUPABASE_SERVICE_ROLE_KEY: secretKey,
      ALLOW_DEV_LOGIN: rawEnv.ALLOW_DEV_LOGIN || "false",
      RESEND_API_KEY: rawEnv.RESEND_API_KEY || "",
      AI_PROVIDER_API_KEY: rawEnv.AI_PROVIDER_API_KEY || "",
      AI_MODEL_FAST: rawEnv.AI_MODEL_FAST || "claude-haiku-5-5",
      AI_MODEL_SMART: rawEnv.AI_MODEL_SMART || "claude-sonnet-5-5",
      AI_DAILY_CALL_CAP: Number(rawEnv.AI_DAILY_CALL_CAP) > 0 ? Number(rawEnv.AI_DAILY_CALL_CAP) : 5000,
      CRON_SECRET: rawEnv.CRON_SECRET || "",
      CALLS_WEBHOOK_SECRET: rawEnv.CALLS_WEBHOOK_SECRET || "",
    };
  } else {
    parsedData = parsed.data;
  }
}

/**
 * Validates critical runtime security constraints at server startup.
 * Invoked by instrumentation.ts register() - NEVER throws on module import.
 */
export function validateRuntimeEnv() {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return;
  }

  const currentAppEnv = process.env.APP_ENV || parsedData.APP_ENV;
  const isDevLoginEnabled =
    (process.env.ALLOW_DEV_LOGIN ?? parsedData.ALLOW_DEV_LOGIN) === "true";

  if (currentAppEnv === "production" && isDevLoginEnabled) {
    throw new Error(
      "FATAL SECURITY ERROR: ALLOW_DEV_LOGIN must never be enabled in production environments (APP_ENV=production)."
    );
  }

  // A production server with missing config would silently emit localhost canonical URLs, break auth and
  // disable cron: fail at startup instead (this runs on server start, never during `next build`).
  if (currentAppEnv === "production") {
    const missing: string[] = [];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || parsedData.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl || /localhost|127\.0\.0\.1/.test(siteUrl)) missing.push("NEXT_PUBLIC_SITE_URL (must not be localhost)");
    if (!(process.env.NEXT_PUBLIC_SUPABASE_URL || parsedData.NEXT_PUBLIC_SUPABASE_URL)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || parsedData.SUPABASE_SECRET_KEY)) {
      missing.push("SUPABASE_SECRET_KEY");
    }
    if (!(process.env.CRON_SECRET || parsedData.CRON_SECRET)) missing.push("CRON_SECRET");
    if (!(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || parsedData.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
      missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }
    // Without a mail key every email would fail and retry to "dead"; better to refuse to start.
    if (!(process.env.RESEND_API_KEY || parsedData.RESEND_API_KEY)) missing.push("RESEND_API_KEY");
    if (!process.env.TRUSTED_PROXY) {
      console.warn("⚠️ [env] TRUSTED_PROXY is not set: rate limits will share one bucket for all clients. Set vercel, cloudflare or none.");
    }
    if (missing.length > 0) {
      throw new Error(`FATAL CONFIG ERROR: missing required production environment variables: ${missing.join(", ")}`);
    }
  }
}

export const env: Env = parsedData;
