/**
 * General consent check for marketing-type messages, enforced where messages are SENT (the outbox worker), not only
 * where they are queued. A message is marketing if its template is listed here; everything else (booking notices,
 * service reminders that have their own opt-in, internal alerts, data-rights notices) is not gated by this.
 *
 * The recipient is matched to an account by email, and the account's latest `marketing` consent decides. No account
 * or no consent means the message is skipped: unsubscribing (a granted=false row) takes effect on the very next
 * delivery even for messages that were already queued.
 */
export const MARKETING_TEMPLATES = new Set(["saved_car_nudge"]);

export function isMarketingTemplate(template: string): boolean {
  return MARKETING_TEMPLATES.has(template);
}

export async function marketingConsentGranted(admin: any, address: string): Promise<boolean> {
  try {
    const email = address.trim().toLowerCase();
    if (!email.includes("@")) return false;
    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!profile?.id) return false;
    const { data: consent } = await admin
      .from("current_consents")
      .select("granted")
      .eq("user_id", profile.id)
      .eq("purpose", "marketing")
      .maybeSingle();
    return consent?.granted === true;
  } catch {
    // If consent cannot be read, do not send marketing.
    return false;
  }
}
