/**
 * scripts/whatsapp-smoke.mjs   (pnpm whatsapp:smoke +919876543210)
 *
 * Sends ONE test message through the WhatsApp Cloud API with the same token and phone number id the app uses.
 * It sends Meta's built-in `hello_world` template, which needs no approval and works on the free test number.
 * The recipient must be added and verified under WhatsApp > API Setup > "To" in the Meta dashboard.
 * Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.
 */
import path from "node:path";
import { loadEnvFile } from "./dev-cron.mjs";

const to = (process.argv[2] || "").replace(/\D/g, "");
if (to.length < 10) {
  console.error("Usage: pnpm whatsapp:smoke +919876543210");
  process.exit(2);
}
const fileEnv = loadEnvFile(path.resolve(process.cwd(), ".env.local"));
const get = (k) => process.env[k] ?? fileEnv[k] ?? "";
const token = get("WHATSAPP_TOKEN");
const phoneId = get("WHATSAPP_PHONE_ID");
if (!token || !phoneId) {
  console.error("WHATSAPP_TOKEN and WHATSAPP_PHONE_ID must both be set.");
  process.exit(2);
}

const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name: "hello_world", language: { code: "en_US" } },
  }),
});
const body = await res.text();
if (!res.ok) {
  console.error(`WhatsApp refused the message (${res.status}): ${body}`);
  console.error("Common causes: expired temporary token (24 h; use a System User token), recipient not verified on the test number, wrong Phone Number ID.");
  process.exit(1);
}
console.log(`Sent to +${to}. ${body}`);
