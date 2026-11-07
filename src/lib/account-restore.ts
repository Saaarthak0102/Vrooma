/** Length of the DPDP cooling-off window. finalize-deletions and cancel_account_deletion() use the same 7 days. */
export const DELETION_GRACE_DAYS = 7;

export interface RestorableProfile {
  role?: string | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
  anonymised_at?: string | null;
}

/**
 * True when a deactivated account may still be restored: a buyer who asked for erasure less than 7 days ago
 * and whose data has not been anonymised yet. Everyone else deactivated (staff, admin-disabled) stays blocked.
 */
export function isRestorableAccount(profile: RestorableProfile | null | undefined, now: number = Date.now()): boolean {
  if (!profile || profile.is_active !== false) return false;
  if (profile.role !== "buyer") return false;
  if (!profile.deleted_at || profile.anonymised_at) return false;
  const requestedAt = new Date(profile.deleted_at).getTime();
  if (Number.isNaN(requestedAt)) return false;
  return now - requestedAt < DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

/** When the data will be permanently erased if the user does nothing. */
export function deletionDeadline(deletedAt: string): Date {
  return new Date(new Date(deletedAt).getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
}
