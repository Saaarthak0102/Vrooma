/**
 * Normalizes Indian phone numbers to standard E.164 format (+91XXXXXXXXXX).
 * Accepts:
 *   - 10 digits starting with 6-9: '9876543210'
 *   - Leading 0: '09876543210'
 *   - Country code with or without plus: '+919876543210', '919876543210', '+91 98765 43210'
 *   - Common delimiters: spaces, hyphens, dots, parentheses
 * Returns:
 *   Normalized string e.g. '+919876543210' or null if invalid.
 */
export function normalizeIndianPhone(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  // Strip all non-digit characters except leading plus
  const hasLeadingPlus = raw.trim().startsWith("+");
  const digitsOnly = raw.replace(/\D/g, "");

  let nationalNumber = "";

  if (hasLeadingPlus || digitsOnly.startsWith("91")) {
    // If started with 91 and has 12 digits total
    if (digitsOnly.startsWith("91") && digitsOnly.length === 12) {
      nationalNumber = digitsOnly.slice(2);
    } else if (digitsOnly.length === 10) {
      nationalNumber = digitsOnly;
    } else {
      return null;
    }
  } else if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    nationalNumber = digitsOnly.slice(1);
  } else if (digitsOnly.length === 10) {
    nationalNumber = digitsOnly;
  } else {
    return null;
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
    return null;
  }

  return `+91${nationalNumber}`;
}

/**
 * Formats an E.164 Indian number (+91XXXXXXXXXX) for human display: "+91 98765 43210"
 */
export function formatIndianPhoneDisplay(phone: string): string {
  const norm = normalizeIndianPhone(phone);
  if (!norm) return phone;
  const digits = norm.slice(3); // remove +91
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

