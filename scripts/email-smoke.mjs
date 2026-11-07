/**
 * scripts/email-smoke.mjs   (pnpm email:smoke you@example.com)
 *
 * Sends ONE test email through Resend with the same key and sender the app uses, so you can confirm the key and
 * the verified domain work before going live. Needs RESEND_API_KEY (and EMAIL_FROM on a verified domain).
 */
import path from "node:path";
import { loadEnvFile } from "./dev-cron.mjs";

const to = process.argv[2];
if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
  console.error("Usage: pnpm email:smoke you@example.com");
  process.exit(2);
}
const fileEnv = loadEnvFile(path.resolve(process.cwd(), ".env.local"));
const get = (k) => process.env[k] ?? fileEnv[k] ?? "";
const key = get("RESEND_API_KEY");
const from = get("EMAIL_FROM") || "Vrooma Lucknow <notifications@vrooma.in>";
if (!key) {
  console.error("RESEND_API_KEY is not set.");
  process.exit(2);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from, to: [to], subject: "Vrooma email check", text: "If you can read this, Resend is set up correctly." }),
});
const body = await res.text();
if (!res.ok) {
  console.error(`Resend refused the email (${res.status}): ${body}`);
  console.error("Common causes: sending domain not verified, EMAIL_FROM not on that domain, wrong API key.");
  process.exit(1);
}
console.log(`Sent from ${from} to ${to}. ${body}`);
