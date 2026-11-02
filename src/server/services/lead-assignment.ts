import { memoryStore } from "@/server/store";
import { Profile } from "@/types/domain";

export interface AssignConsultantParams {
  showroomId: string;
  modelId?: string | null;
}

/**
 * Assigns a lead to a sales consultant based on showroom location and round-robin priority.
 */
export function assignConsultant({
  showroomId,
}: AssignConsultantParams): Profile | null {
  const consultants = memoryStore.users.filter((u) => u.role === "consultant");
  if (consultants.length === 0) return null;

  // For mock, pick consultant matching city or round-robin
  const showroom = memoryStore.showrooms.find((s) => s.id === showroomId);
  const matched = consultants.filter((c) => c.city_id === (showroom?.city_id ?? "city-lucknow"));

  const pool = matched.length > 0 ? matched : consultants;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

