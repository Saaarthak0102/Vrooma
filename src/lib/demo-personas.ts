/**
 * The nine demo accounts (same ids and emails everywhere: DEV, and production's demo data in migration 0042).
 * One place for: the instant demo sign-in, the migration generator, and the rule that nothing is ever emailed or sent
 * to a demo address. Kept pure (no server imports) so client code and tests can use it.
 *
 * None of these accounts has a password. They are signed in by the demo login route (only when DEMO_LOGIN=true), and
 * their addresses are not real mailboxes.
 */

export type DemoRole = "buyer" | "consultant" | "manager" | "admin";

export interface DemoPersona {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: DemoRole;
  /** Showroom the account belongs to (staff only). */
  showroomId?: string;
}

const HAZRATGANJ = "a0000001-0000-0000-0000-000000000001";
const GOMTI_NAGAR = "a0000001-0000-0000-0000-000000000002";
const KANPUR = "a0000001-0000-0000-0000-000000000003";

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  { id: "00000000-0000-0000-0000-000000000001", email: "dev-buyer@vrooma.in", fullName: "Aditya Mishra (Dev Buyer)", phone: "+919876500001", role: "buyer" },
  { id: "00000000-0000-0000-0000-000000000010", email: "dev-consultant@vrooma.in", fullName: "Dev Consultant", phone: "+919876500010", role: "consultant", showroomId: HAZRATGANJ },
  { id: "00000000-0000-0000-0000-000000000011", email: "rohit.verma@vrooma.in", fullName: "Rohit Verma (Dev Consultant)", phone: "+919876500011", role: "consultant", showroomId: HAZRATGANJ },
  { id: "00000000-0000-0000-0000-000000000012", email: "ananya.shukla@vrooma.in", fullName: "Ananya Shukla (Dev Consultant)", phone: "+919876500012", role: "consultant", showroomId: HAZRATGANJ },
  { id: "00000000-0000-0000-0000-000000000013", email: "faizan.khan@vrooma.in", fullName: "Faizan Khan (Dev Consultant)", phone: "+919876500013", role: "consultant", showroomId: GOMTI_NAGAR },
  { id: "00000000-0000-0000-0000-000000000014", email: "deepak.tripathi@vrooma.in", fullName: "Deepak Tripathi (Dev Consultant)", phone: "+919876500014", role: "consultant", showroomId: GOMTI_NAGAR },
  { id: "00000000-0000-0000-0000-000000000015", email: "pooja.singh@vrooma.in", fullName: "Pooja Singh (Dev Consultant)", phone: "+919876500015", role: "consultant", showroomId: KANPUR },
  { id: "00000000-0000-0000-0000-000000000019", email: "dev-manager@vrooma.in", fullName: "Vivek Saxena (Dev Manager)", phone: "+919876500019", role: "manager", showroomId: HAZRATGANJ },
  { id: "00000000-0000-0000-0000-000000000099", email: "dev-admin@vrooma.in", fullName: "Sanjay Singhania (Dev Admin)", phone: "+919876500099", role: "admin" },
];

/** The four accounts behind the quick persona buttons, one per user type. */
export const QUICK_LOGIN_PERSONAS: Record<DemoRole, DemoPersona> = {
  buyer: DEMO_PERSONAS[0],
  consultant: DEMO_PERSONAS[1],
  manager: DEMO_PERSONAS[7],
  admin: DEMO_PERSONAS[8],
};

/** Where each role lands after a quick sign-in. */
export const DEMO_LANDING: Record<DemoRole, string> = {
  buyer: "/dashboard",
  consultant: "/staff",
  manager: "/staff",
  admin: "/admin",
};

export function isDemoRole(value: unknown): value is DemoRole {
  return value === "buyer" || value === "consultant" || value === "manager" || value === "admin";
}

const PERSONA_EMAILS = new Set(DEMO_PERSONAS.map((p) => p.email.toLowerCase()));
const PERSONA_PHONES = new Set(DEMO_PERSONAS.map((p) => p.phone));

/** Reserved for documentation and testing (RFC 2606 / 6761): nobody can receive mail there. */
const RESERVED_DOMAINS = ["example.com", "example.org", "example.net"];
const RESERVED_SUFFIXES = [".test", ".invalid", ".example", ".localhost"];

/** Phone numbers the demo seed generates for its fake buyers (+91 900 1000xxx). */
const DEMO_PHONE_PREFIX = "+919001000";

/**
 * True for every address that belongs to demo data: the nine demo accounts, reserved example domains, and the fake
 * phone numbers of the demo buyers. Such messages are never sent, in any environment.
 */
export function isDemoAddress(address: string | null | undefined): boolean {
  const value = String(address ?? "").trim().toLowerCase();
  if (!value) return false;

  if (value.includes("@")) {
    if (PERSONA_EMAILS.has(value)) return true;
    const host = value.slice(value.lastIndexOf("@") + 1);
    return (
      RESERVED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)) ||
      RESERVED_SUFFIXES.some((s) => host.endsWith(s)) ||
      host === "localhost"
    );
  }

  const phone = value.replace(/[\s-]/g, "");
  return PERSONA_PHONES.has(phone) || phone.startsWith(DEMO_PHONE_PREFIX);
}
