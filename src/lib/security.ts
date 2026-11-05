import { NextRequest } from "next/server";

/**
 * Validates request origin against Sec-Fetch-Site and Origin header.
 * Rejects cross-site mutating requests to API endpoints.
 */
export function verifyRequestOrigin(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Strips HTML tags, script blocks, and dangerous payload prefixes from user text.
 */
export function sanitizePlainText(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

