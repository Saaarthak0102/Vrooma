const indianRegNoRegex = /^([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;

export function normalizeVehicleReg(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!indianRegNoRegex.test(clean)) {
    return null;
  }
  return clean;
}

export function maskVehicleReg(regNo?: string | null): string {
  if (!regNo) return "";
  const clean = regNo.replace(/[\s-]/g, "").toUpperCase();
  if (clean.length < 8) return "UP32 ** **** ****";
  const stateRto = clean.slice(0, 4);
  const lastFour = clean.slice(-4);
  return `${stateRto} ** **** ${lastFour}`;
}

