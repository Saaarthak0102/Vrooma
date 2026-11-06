/**
 * src/lib/network.ts
 *
 * Secure Client IP Resolution for Rate Limiting & Audit Logging.
 * Prioritizes trusted platform proxy headers to prevent IP spoofing attacks.
 */

/**
 * Derives the trusted client IP from incoming request headers.
 * Protects against spoofed 'X-Forwarded-For' headers by prioritizing
 * trusted edge platform headers (Vercel, Cloudflare) and rightmost proxy hops.
 */
export function getTrustedClientIp(request: Request | { headers: Headers }): string {
  const headers = request.headers;

  // 1. Platform-guaranteed edge headers (cannot be overwritten by internet clients)
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  const trueClientIp = headers.get("true-client-ip");
  if (trueClientIp) {
    return trueClientIp.trim();
  }

  // 2. Direct reverse proxy header
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // 3. X-Forwarded-For handling:
  // When an attacker injects 'X-Forwarded-For: spoofed_ip', reverse proxies append
  // the real IP at the end. Taking the rightmost IP prevents spoofing.
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return "127.0.0.1";
}

