/**
 * src/lib/network.ts
 *
 * Trusted client IP resolution for rate limiting and audit logging.
 *
 * The header we may trust depends on WHO sits in front of the app, so it is chosen by the
 * TRUSTED_PROXY setting and never guessed from whichever header happens to be present:
 *
 *   vercel      -> `x-vercel-forwarded-for` (Vercel overwrites it on every external request), falling
 *                  back to the first entry of `x-forwarded-for`, which Vercel also overwrites (it does
 *                  not append to a client-sent value). Every other forwarding header is ignored.
 *   cloudflare  -> `cf-connecting-ip` only. Cloudflare overwrites it on every request.
 *   none        -> every forwarded header is ignored (default for local dev / unknown hosts).
 *                  Uses the socket address when the caller supplies one, otherwise a single shared
 *                  "unknown" bucket, which is rate limited globally instead of per client.
 *
 * ASSUMPTION (cannot be proven inside the app): in `vercel` mode the app is reachable ONLY through
 * Vercel's edge, so a client cannot reach the origin directly and the platform headers are always
 * platform-written. The same holds for `cloudflare` mode: the origin must only accept Cloudflare
 * traffic (Authenticated Origin Pulls or an IP allow-list). If the origin is directly reachable,
 * set TRUSTED_PROXY=none.
 */
import { isIP } from "node:net";

export type TrustedProxy = "vercel" | "cloudflare" | "none";

/** Shared bucket used when no trustworthy address is available. */
export const UNKNOWN_IP_BUCKET = "unknown";

/** Parses the TRUSTED_PROXY setting. Anything unrecognised fails closed to "none". */
export function parseTrustedProxy(raw: string | undefined | null): TrustedProxy {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "vercel" || value === "cloudflare") return value;
  return "none";
}

function validIp(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  return isIP(trimmed) ? trimmed : null;
}

function firstListEntry(value: string | null): string | null {
  if (!value) return null;
  return validIp(value.split(",")[0]);
}

export interface ClientIpOptions {
  /** Override of the TRUSTED_PROXY env setting (used by tests). */
  proxy?: TrustedProxy;
  /** Socket address of the peer, when the runtime exposes it. Used only in `none` mode. */
  socketIp?: string | null;
}

/**
 * Derives the client IP used as a rate-limit / audit key.
 * Never returns a value taken from a header that the active TRUSTED_PROXY mode does not trust.
 */
export function getTrustedClientIp(
  request: Request | { headers: Headers },
  options: ClientIpOptions = {}
): string {
  const proxy = options.proxy ?? parseTrustedProxy(process.env.TRUSTED_PROXY);
  const headers = request.headers;

  if (proxy === "vercel") {
    const ip =
      firstListEntry(headers.get("x-vercel-forwarded-for")) ??
      firstListEntry(headers.get("x-forwarded-for"));
    return ip ?? UNKNOWN_IP_BUCKET;
  }

  if (proxy === "cloudflare") {
    return validIp(headers.get("cf-connecting-ip")) ?? UNKNOWN_IP_BUCKET;
  }

  return validIp(options.socketIp) ?? UNKNOWN_IP_BUCKET;
}
