import { Slot } from "@/types/domain";

/**
 * Validates slot availability and ensures capacity is not exceeded.
 */
export function checkSlotAvailability(slot: { capacity: number; booked_count: number }): {
  available: boolean;
  remainingCapacity: number;
} {
  const remaining = slot.capacity - slot.booked_count;
  return {
    available: remaining > 0,
    remainingCapacity: Math.max(0, remaining),
  };
}
