export type SlaStatus = "met" | "ok" | "warn" | "breached";

export interface SlaResult {
  state: SlaStatus;
  remainingSeconds: number;
  isBreached: boolean;
  label: string;
}

/**
 * Calculates the current SLA state for a lead or enquiry.
 * 
 * Target SLA: 5 minutes from creation.
 * If firstContactedAt is provided:
 *   - "met" if contacted before dueAt
 *   - "breached" if contacted after dueAt
 * If firstContactedAt is NOT provided:
 *   - "breached" if now > dueAt (remainingSeconds < 0)
 *   - "warn" if remainingSeconds <= 120 (<= 2 minutes left)
 *   - "ok" if remainingSeconds > 120 (> 2 minutes left)
 */
export function slaState(
  dueAt: Date | string,
  firstContactedAt: Date | string | null | undefined,
  now: Date | string = new Date()
): SlaResult {
  const dueDate = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const nowDate = typeof now === "string" ? new Date(now) : now;
  const contactedDate = firstContactedAt
    ? typeof firstContactedAt === "string"
      ? new Date(firstContactedAt)
      : firstContactedAt
    : null;

  const remainingSeconds = Math.floor((dueDate.getTime() - nowDate.getTime()) / 1000);

  if (contactedDate) {
    if (contactedDate.getTime() <= dueDate.getTime()) {
      return {
        state: "met",
        remainingSeconds: 0,
        isBreached: false,
        label: "SLA Met",
      };
    } else {
      return {
        state: "breached",
        remainingSeconds: Math.floor((dueDate.getTime() - contactedDate.getTime()) / 1000),
        isBreached: true,
        label: "Contacted (Breached)",
      };
    }
  }

  if (remainingSeconds < 0) {
    return {
      state: "breached",
      remainingSeconds,
      isBreached: true,
      label: `Breached by ${formatSeconds(Math.abs(remainingSeconds))}`,
    };
  }

  if (remainingSeconds <= 120) {
    return {
      state: "warn",
      remainingSeconds,
      isBreached: false,
      label: `${formatSeconds(remainingSeconds)} left`,
    };
  }

  return {
    state: "ok",
    remainingSeconds,
    isBreached: false,
    label: `${formatSeconds(remainingSeconds)} left`,
  };
}

export function formatSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

