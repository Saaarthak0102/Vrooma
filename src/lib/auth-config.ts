/**
 * Length of the emailed one-time sign-in code.
 *
 * This MUST equal the Supabase project's "Email OTP Length" (Dashboard > Authentication > Providers > Email;
 * `otp_length` in supabase/config.toml for local dev). The UI, the sign-in sheet and the server action all read
 * this one constant, so changing the length is a single-place change.
 *
 * NEXT_PUBLIC_ so the browser bundle and the server agree on the value.
 */
const parsed = Number(process.env.NEXT_PUBLIC_AUTH_OTP_LENGTH);

export const OTP_LENGTH: number = Number.isInteger(parsed) && parsed >= 6 && parsed <= 10 ? parsed : 8;

/** Keeps digits only (so pasted "1234 5678" works) and drops anything beyond the configured length. */
export function sanitizeOtp(raw: string): string {
  return (raw ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);
}
