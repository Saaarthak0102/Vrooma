/**
 * Email rendering for the outbox. One shared layout, a subject per template, and the plain-text body kept as the
 * text alternative. All body text is HTML-escaped; line breaks are preserved.
 */

const SUBJECTS: Record<string, string> = {
  booking_confirmation: "Your Vrooma booking is confirmed",
  booking_cancellation: "Your Vrooma booking was cancelled",
  lead_reassigned: "A lead has been reassigned to you",
  consultant_reply: "Your Vrooma consultant replied",
  lead_closed_deletion: "Your enquiry was closed",
  newsletter_subscription_confirmed: "You are subscribed to Vrooma updates",
  lead_task_assigned: "A follow-up task for you",
  lead_stale_alert: "A lead has gone quiet",
  lead_escalated: "A consultant needs a manager on a lead",
  service_due: "Your car is due for service",
  insurance_expiry: "A document for your car is about to expire",
  test_drive_reminder: "Reminder: your Vrooma test drive",
  service_reminder: "Reminder: your Vrooma service appointment",
  booking_outcome_needed: "Booking outcome needed",
  lead_uncontacted_escalation: "Lead still uncontacted after 15 minutes",
  chat_waiting_alert: "A buyer is waiting in chat",
  price_rule_expiry_alert: "On-road price rule expiring",
  offer_expiry_alert: "An offer is about to end",
  dpdp_deadline_alert: "A data request deadline is close",
};

export function emailSubject(template: string): string {
  if (SUBJECTS[template]) return SUBJECTS[template];
  if (/^dpdp_.*_request_received$/.test(template)) return "We received your data request";
  const words = template.replace(/_/g, " ").trim();
  return `Vrooma: ${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmail(template: string, body: string): { subject: string; html: string; text: string } {
  const subject = emailSubject(template);
  const content = escapeHtml(body).replace(/\r?\n/g, "<br>");
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#FAFAF9;font-family:Arial,Helvetica,sans-serif;color:#1C1917;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E7E5E4;border-radius:12px;">
<tr><td style="padding:20px 24px;border-bottom:1px solid #E7E5E4;font-size:18px;font-weight:700;">Vrooma<span style="color:#E11D48;">.</span></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6;">${content}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #E7E5E4;font-size:12px;color:#78716C;">Vrooma, authorised dealer, Lucknow &amp; Kanpur. You received this because of an enquiry or booking with us.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text: body };
}
