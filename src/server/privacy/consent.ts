import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { ConsentPurpose, ConsentSource } from "@/types/domain";

export const POLICY_VERSION = "2026.1";

export type ConsentSourceInput = ConsentSource | "profile" | "data_rights";

export interface RecordConsentParams {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  purpose: ConsentPurpose;
  granted: boolean;
  source: ConsentSourceInput;
  consentText?: string;
  ipAddress?: string | null;
}

/**
 * Computes deterministic SHA-256 hash of statutory consent text displayed to user.
 */
export function computeConsentTextHash(text?: string): string {
  if (!text) {
    // Default statutory consent statement hash
    const defaultStatement = "I consent to Vrooma collecting and processing my contact details for automotive enquiries under the DPDP Act 2023.";
    return crypto.createHash("sha256").update(defaultStatement, "utf8").digest("hex");
  }
  return crypto.createHash("sha256").update(text.trim(), "utf8").digest("hex");
}

/**
 * Generates tamper-proof HMAC token for one-click email unsubscribe links.
 */
export function generateUnsubscribeToken(email: string): string {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY || "vrooma-unsubscribe-secret-salt";
  const hmac = crypto.createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");
  const payload = Buffer.from(`${email.toLowerCase().trim()}:${hmac}`).toString("base64url");
  return payload;
}

/**
 * Validates one-click unsubscribe token and extracts target email.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [email, signature] = decoded.split(":");
    if (!email || !signature) return null;

    const secret = env.SUPABASE_SERVICE_ROLE_KEY || "vrooma-unsubscribe-secret-salt";
    const expected = crypto.createHmac("sha256", secret).update(email.toLowerCase().trim()).digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
      return email.toLowerCase().trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Records an immutable DPDP consent event in public.consents table.
 */
export async function recordConsent(params: RecordConsentParams): Promise<string> {
  const admin = createAdminClient();
  const textHash = computeConsentTextHash(params.consentText);

  const dbSource: ConsentSource =
    params.source === "profile"
      ? "onboarding"
      : params.source === "data_rights"
      ? "signup"
      : params.source;

  const { data, error } = await admin
    .from("consents")
    .insert({
      user_id: params.userId || null,
      subject_email: params.email ? params.email.toLowerCase().trim() : null,
      subject_phone: params.phone || null,
      purpose: params.purpose,
      granted: params.granted,
      policy_version: POLICY_VERSION,
      source: dbSource,
      text_hash: textHash,
    })
    .select("id")
    .single();

  if (error) {
    console.warn(`[consent] Failed to record consent: ${error.message}`);
    throw new Error(`Consent recording failed: ${error.message}`);
  }

  return data.id;
}

/**
 * Withdraws a specific statutory consent by appending a granted=false row.
 */
export async function withdrawConsent(
  userId: string,
  purpose: ConsentPurpose,
  source: RecordConsentParams["source"] = "profile"
): Promise<string> {
  return recordConsent({
    userId,
    purpose,
    granted: false,
    source,
  });
}

/**
 * Verifies if a user has an active granted consent for a specific purpose.
 */
export async function hasCurrentConsent(
  userId: string,
  purpose: ConsentPurpose
): Promise<boolean> {
  const admin = createAdminClient();

  // Query latest consent record for user and purpose
  const { data, error } = await admin
    .from("consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return Boolean(data.granted);
}
