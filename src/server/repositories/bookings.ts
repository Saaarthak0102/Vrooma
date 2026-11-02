import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Booking } from "@/types/domain";

export async function listBookings(userId?: string): Promise<Booking[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    if (userId) {
      return memoryStore.bookings.filter((b) => b.user_id === userId);
    }
    return [...memoryStore.bookings];
  }
  throw new Error("TODO(day-4): Supabase listBookings not implemented yet");
}

export async function createBooking(data: Omit<Booking, "id" | "created_at">): Promise<Booking> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const booking: Booking = {
      ...data,
      id: `book-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    return memoryStore.addBooking(booking);
  }
  throw new Error("TODO(day-4): Supabase createBooking not implemented yet");
}

