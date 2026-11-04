import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_USE_MOCK: z
    .string()
    .default("true")
    .transform((val) => val === "true" || val === "1"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SECRET_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  ALLOW_DEV_LOGIN: z.string().optional().default("false"),
  RESEND_API_KEY: z.string().optional().default(""),
  AI_PROVIDER_API_KEY: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default(""),
});

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK ?? "true",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
  SUPABASE_SECRET_KEY: secretKey,
  SUPABASE_SERVICE_ROLE_KEY: secretKey,
  ALLOW_DEV_LOGIN: process.env.ALLOW_DEV_LOGIN ?? "false",
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  AI_PROVIDER_API_KEY: process.env.AI_PROVIDER_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
});

if (!parsed.success) {
  console.warn("⚠️ Invalid environment variables:", parsed.error.format());
}

// Critical security check: Never allow dev login backdoor in production
if (
  process.env.NODE_ENV === "production" &&
  (process.env.ALLOW_DEV_LOGIN === "true" || parsed.data?.ALLOW_DEV_LOGIN === "true")
) {
  throw new Error("FATAL SECURITY ERROR: ALLOW_DEV_LOGIN must never be enabled in production.");
}

export const env = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_USE_MOCK: true,
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SECRET_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ALLOW_DEV_LOGIN: "false",
      RESEND_API_KEY: "",
      AI_PROVIDER_API_KEY: "",
      CRON_SECRET: "",
    };

