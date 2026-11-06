/**
 * scripts/dev-cron.mjs   (pnpm dev:cron)
 *
 * LOCAL-ONLY scheduler. Supabase's servers cannot reach http://localhost:3000, so the pg_cron + pg_net
 * jobs that call the app cannot fire while you develop. This loop calls the same routes every 60 seconds:
 *
 *   /api/cron/outbox   (send queued emails / messages)
 *   /api/cron/sla      (flag leads past the 5-minute SLA; idempotent, so it is safe next to the pg_cron job)
 *
 * It refuses to run unless APP_ENV is not "production" AND the target URL is localhost.
 *
 * Usage:   pnpm dev:cron            (loop)
 *          pnpm dev:cron --once     (single pass, useful for a quick check)
 */
import fs from "node:fs";
import path from "node:path";

export const CRON_ROUTES = ["/api/cron/outbox", "/api/cron/sla"];
export const INTERVAL_MS = 60_000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

/**
 * Pure validation so it can be unit tested.
 * @returns {{ ok: true, baseUrl: string, secret: string } | { ok: false, error: string }}
 */
export function resolveDevCronConfig(env) {
  const appEnv = (env.APP_ENV || "").toLowerCase();
  if (appEnv === "production" || (env.NODE_ENV || "").toLowerCase() === "production") {
    return { ok: false, error: "REFUSED: APP_ENV/NODE_ENV is production. dev-cron is for local development only." };
  }

  const baseUrl = (env.DEV_CRON_BASE_URL || env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  let host;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return { ok: false, error: `REFUSED: invalid base URL "${baseUrl}".` };
  }
  if (!LOCAL_HOSTS.has(host)) {
    return { ok: false, error: `REFUSED: target host "${host}" is not localhost. dev-cron only calls a local dev server.` };
  }

  const secret = (env.CRON_SECRET || "").trim();
  if (!secret) {
    return { ok: false, error: "REFUSED: CRON_SECRET is not set in .env.local (use the DEV secret)." };
  }
  return { ok: true, baseUrl, secret };
}

export async function runOnce({ baseUrl, secret }, fetchImpl = fetch) {
  const results = [];
  for (const route of CRON_ROUTES) {
    const started = Date.now();
    try {
      const res = await fetchImpl(`${baseUrl}${route}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const text = await res.text();
      results.push({ route, status: res.status, ms: Date.now() - started, body: text.slice(0, 160) });
    } catch (err) {
      results.push({ route, status: 0, ms: Date.now() - started, body: String(err?.message || err) });
    }
  }
  return results;
}

async function main() {
  const fileEnv = loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  // Shell values win over the file, matching how Next.js treats .env.local
  const env = { ...fileEnv, ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) };

  const cfg = resolveDevCronConfig(env);
  if (!cfg.ok) {
    console.error(cfg.error);
    process.exit(1);
  }

  const once = process.argv.includes("--once");
  console.log(`[dev-cron] ${once ? "single pass" : `every ${INTERVAL_MS / 1000}s`} against ${cfg.baseUrl}`);

  const tick = async () => {
    const stamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
    for (const r of await runOnce(cfg)) {
      const flag = r.status >= 200 && r.status < 300 ? "ok " : "ERR";
      console.log(`[dev-cron ${stamp}] ${flag} ${r.status} ${r.route} (${r.ms}ms) ${r.body}`);
    }
  };

  await tick();
  if (once) return;
  setInterval(tick, INTERVAL_MS);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  main();
}
