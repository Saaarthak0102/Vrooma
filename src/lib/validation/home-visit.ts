/**
 * Home test drive / vehicle pickup details. The customer's address is not kept on the profile: it is asked
 * here, only when a booking actually needs it, and stored on that booking.
 */
export const PINCODE_RE = /^[1-9][0-9]{5}$/;

export interface HomeVisitErrors {
  address?: string;
  pincode?: string;
}

export function validateHomeVisit(address: string, pincode: string): HomeVisitErrors {
  const errors: HomeVisitErrors = {};
  if (address.trim().length < 5) errors.address = "Please enter the full address (at least 5 characters).";
  if (address.trim().length > 255) errors.address = "Address cannot exceed 255 characters.";
  if (!PINCODE_RE.test(pincode.trim())) errors.pincode = "Enter a valid 6-digit PIN code.";
  return errors;
}
