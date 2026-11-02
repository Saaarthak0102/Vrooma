import { memoryStore } from "@/server/store";
import { Slot } from "@/types/domain";

/**
 * Validates slot availability and ensures capacity is not exceeded.
 */
export function checkSlotAvailability(slotId: string): {
  available: boolean;
  remainingCapacity: number;
  slot?: Slot;
} {
  const slot = memoryStore.slots.find((s) => s.id === slotId);
  if (!slot) {
    return { available: false, remainingCapacity: 0 };
  }

  const remaining = slot.capacity - slot.booked_count;
  return {
    available: remaining > 0,
    remainingCapacity: Math.max(0, remaining),
    slot,
  };
}
