/**
 * Sanitizes and validates post-authentication redirect targets.
 * Strict defence against Open Redirect attacks.
 *
 * Rules:
 * - Must be a relative path starting with a single '/'
 * - Must NOT start with '//' or '/\'
 * - Must NOT contain protocols ('http:', 'https:', 'javascript:', 'data:')
 * - Decodes URL entities to detect obfuscated attacks
 * - Restricts to allow-listed route prefixes
 * - Supports optional locale prefix (/en or /hi)
 * - Length limit (max 500 chars)
 * - Defaults to '/dashboard' if invalid or unsafe
 */

const ALLOWED_PATH_PREFIXES = [
  "/dashboard",
  "/book",
  "/cars",
  "/used-cars",
  "/profile",
  "/onboarding",
  "/staff",
  "/admin",
  "/emi-calculator",
  "/trade-in",
  "/offers",
  "/showrooms",
  "/about",
  "/contact",
  "/legal",
];

export function safeNext(rawNext: string | null | undefined, locale = "en"): string {
  const getFallback = (loc: string) => (loc === "hi" ? "/hi/dashboard" : "/dashboard");
  const fallback = getFallback(locale);

  if (!rawNext || typeof rawNext !== "string") {
    return fallback;
  }

  const trimmed = rawNext.trim();

  // Length guard
  if (trimmed.length > 500 || trimmed.length === 0) {
    return fallback;
  }

  // Must begin with a single '/' and not with '//' or '/\' or '\\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("\\")) {
    return fallback;
  }

  // Try decoding to check for hidden protocols e.g. %2f%2fevil.com
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  // Check again after decoding
  if (decoded.startsWith("//") || decoded.startsWith("/\\") || decoded.startsWith("\\")) {
    return fallback;
  }

  // Block protocols
  const lower = decoded.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:") ||
    lower.includes("http:") ||
    lower.includes("https:")
  ) {
    return fallback;
  }

  // Strip query string and hash for prefix validation
  const pathWithoutQuery = trimmed.split("?")[0].split("#")[0];

  // Strip locale prefix if present (e.g. /en/cars -> /cars, /hi/cars -> /cars)
  let normalizedPath = pathWithoutQuery;
  let targetLocale = locale;

  if (normalizedPath.startsWith("/en/") || normalizedPath === "/en") {
    normalizedPath = normalizedPath.slice(3) || "/";
    targetLocale = "en";
  } else if (normalizedPath.startsWith("/hi/") || normalizedPath === "/hi") {
    normalizedPath = normalizedPath.slice(3) || "/";
    targetLocale = "hi";
  }

  // Root path '/' is safe
  if (normalizedPath === "/" || normalizedPath === "") {
    return targetLocale === "hi" ? "/hi" : "/";
  }

  // Check against allowed path prefixes
  const isAllowed = ALLOWED_PATH_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );

  if (!isAllowed) {
    return getFallback(targetLocale);
  }

  // Retain query parameters from the original sanitized string if present
  const queryAndHash = trimmed.slice(pathWithoutQuery.length);

  // Return formatted localized path according to next-intl 'as-needed' rule
  if (targetLocale === "hi") {
    return `/hi${normalizedPath}${queryAndHash}`;
  }
  return `${normalizedPath}${queryAndHash}`;
}
