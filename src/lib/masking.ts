/**
 * Masks an Indian vehicle registration number for privacy and DPDP Act compliance.
 * Example: "UP32AB1234" -> "UP32 ** **** 1234"
 * Example: "UP-32-CD-5678" -> "UP32 ** **** 5678"
 */
export function maskRegNo(regNo: string | null | undefined): string {
  if (!regNo) return "UP32 ** **** ****";
  
  // Clean alphanumeric only
  const clean = regNo.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length < 8) {
    return "UP32 ** **** ****";
  }

  const stateAndRto = clean.slice(0, 4); // e.g. UP32
  const lastFour = clean.slice(-4);      // e.g. 1234

  return `${stateAndRto} ** **** ${lastFour}`;
}

/**
 * Masks a phone number showing only the last 4 digits.
 * Example: "9876543210" -> "******3210"
 * Example: "+919876543210" -> "+91 ******3210"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "******0000";
  const clean = phone.trim();
  if (clean.length <= 4) return "****";
  
  const last4 = clean.slice(-4);
  const prefix = clean.startsWith("+91") ? "+91 " : "";
  return `${prefix}******${last4}`;
}

