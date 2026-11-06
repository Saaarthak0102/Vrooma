import type { Role } from "@/types/domain";

export interface ConsoleLink {
  href: string;
  label: string;
  /** Roles that can open this screen. Must match the middleware and the page's own requireRole. */
  roles: Role[];
  exact?: boolean;
}

/**
 * Every non-buyer screen. Each role gets 2-3: consultant 2, manager 3, admin 3 of their own
 * (the admin can also open the staff screens).
 */
export const CONSOLE_LINKS: ConsoleLink[] = [
  { href: "/staff", label: "Lead Desk", roles: ["consultant", "manager", "admin"], exact: true },
  { href: "/staff/bookings", label: "Bookings", roles: ["consultant", "manager", "admin"] },
  { href: "/staff/stock", label: "Used Stock", roles: ["manager", "admin"] },
  { href: "/admin", label: "Overview", roles: ["admin"], exact: true },
  { href: "/admin/catalog", label: "Catalog", roles: ["admin"] },
  { href: "/admin/team", label: "Team & Network", roles: ["admin"] },
];

export function linksForRole(role: Role): ConsoleLink[] {
  return CONSOLE_LINKS.filter((l) => l.roles.includes(role));
}

/** Where a role lands after signing in. */
export function landingPathForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "consultant" || role === "manager") return "/staff";
  return "/dashboard";
}

export const ROLE_LABEL: Record<Role, string> = {
  buyer: "Buyer",
  consultant: "Sales Consultant",
  manager: "Used-Car Manager",
  admin: "Dealer Principal",
};
