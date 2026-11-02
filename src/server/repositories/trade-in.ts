import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { TradeInRequest } from "@/types/domain";

export async function createTradeInRequest(
  data: Omit<TradeInRequest, "id" | "created_at">
): Promise<TradeInRequest> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const item: TradeInRequest = {
      ...data,
      id: `tradein-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    return memoryStore.addTradeIn(item);
  }
  throw new Error("TODO(day-4): Supabase createTradeInRequest not implemented yet");
}
