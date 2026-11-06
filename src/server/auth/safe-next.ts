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
 * - Tolerates a legacy /en or /hi prefix (old links) and strips it; the app is English only
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

export function safeNext(rawNext: string | null | undefined): string {
  const fallback = "/dashboard";

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

  // Old links may still carry the retired language prefix (/en/cars, /hi/cars): drop it.
  let normalizedPath = pathWithoutQuery;
  if (normalizedPath === "/en" || normalizedPath === "/hi") {
    normalizedPath = "/";
  } else if (normalizedPath.startsWith("/en/") || normalizedPath.startsWith("/hi/")) {
    normalizedPath = normalizedPath.slice(3);
  }

  // Root path '/' is safe
  if (normalizedPath === "/" || normalizedPath === "") {
    return "/";
  }

  // Check against allowed path prefixes
  const isAllowed = ALLOWED_PATH_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );

  if (!isAllowed) {
    return fallback;
  }

  // Retain query parameters from the original sanitized string if present
  const queryAndHash = trimmed.slice(pathWithoutQuery.length);
  return `${normalizedPath}${queryAndHash}`;
}
