import { env } from "@/lib/env";
import { memoryStore } from "@/server/store";
import { Profile, Role } from "@/types/domain";

export async function listUsers(role?: Role): Promise<Profile[]> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    if (role) {
      return memoryStore.users.filter((u) => u.role === role);
    }
    return [...memoryStore.users];
  }
  throw new Error("TODO(day-4): Supabase listUsers not implemented yet");
}

export async function getUserById(id: string): Promise<Profile | null> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    return memoryStore.users.find((u) => u.id === id) ?? null;
  }
  throw new Error("TODO(day-4): Supabase getUserById not implemented yet");
}

export async function updateUser(id: string, updates: Partial<Profile>): Promise<Profile> {
  if (env.NEXT_PUBLIC_USE_MOCK) {
    const updated = memoryStore.updateUser(id, updates);
    if (!updated) {
      throw new Error("User not found");
    }
    return updated;
  }
  throw new Error("TODO(day-4): Supabase updateUser not implemented yet");
}

