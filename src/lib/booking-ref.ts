/**
 * Pure helper to convert any raw booking ID into a human-readable booking reference.
 * Format: "VR-" + first 6 alphanumeric characters of the ID, uppercased.
 * Example: "book-sample-1" -> "VR-BOOKSA"
 */
export function bookingRef(id: string): string {
  if (!id) return "VR-000000";
  const alphanumeric = id.replace(/[^a-zA-Z0-9]/g, "");
  const chars = alphanumeric.slice(0, 6).toUpperCase();
  return `VR-${chars.padEnd(6, "0")}`;
}

