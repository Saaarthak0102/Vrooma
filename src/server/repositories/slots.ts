import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Slot, DemoCar } from "@/types/domain";

export interface ListSlotsParams {
  kind?: "test_drive" | "service";
  showroomId?: string;
  workshopId?: string;
  demoCarId?: string;
  date?: string; // YYYY-MM-DD
}

export async function listSlots(params: ListSlotsParams = {}): Promise<Slot[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    let slots = [...memoryStore.slots];

    if (params.kind) {
      slots = slots.filter((s) => s.kind === params.kind);
    }
    if (params.showroomId) {
      slots = slots.filter((s) => s.showroom_id === params.showroomId);
    }
    if (params.workshopId) {
      slots = slots.filter((s) => s.workshop_id === params.workshopId);
    }
    if (params.demoCarId) {
      slots = slots.filter((s) => s.demo_car_id === params.demoCarId);
    }
    if (params.date) {
      slots = slots.filter((s) => s.starts_at.startsWith(params.date!));
    }

    return slots;
  }

  throw new Error("TODO(day-4): Supabase listSlots not implemented yet");
}

export async function listDemoCars(showroomId?: string): Promise<DemoCar[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    if (showroomId) {
      return memoryStore.demoCars.filter((d) => d.showroom_id === showroomId && d.active);
    }
    return memoryStore.demoCars.filter((d) => d.active);
  }
  throw new Error("TODO(day-4): Supabase listDemoCars not implemented yet");
}

