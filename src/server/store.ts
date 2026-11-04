/**
 * TEST-ONLY IN-MEMORY STORE.
 * Replaced in production by Supabase repositories (Phase 3).
 * Retained exclusively for isolated Vitest unit test fixtures.
 */
import { mockModels } from "@/data/mock/models";
import { mockVariants } from "@/data/mock/variants";
import { mockUsedCars } from "@/data/mock/used-cars";
import { mockPriceRules } from "@/data/mock/price-rules";
import { mockShowrooms, mockWorkshops } from "@/data/mock/showrooms";
import { mockSlots, mockDemoCars } from "@/data/mock/slots";
import { mockUsers } from "@/data/mock/users";
import { mockLeads } from "@/data/mock/leads";
import { mockOffers, mockBanners } from "@/data/mock/offers";
import {
  Booking,
  Lead,
  TradeInRequest,
  OutboxMessage,
  PriceRule,
  UsedCar,
  Model,
  Variant,
  Profile,
} from "@/types/domain";

// Global module-level in-memory store for session continuity in mock mode
class MemoryStore {
  models: Model[] = [...mockModels];
  variants: Variant[] = [...mockVariants];
  usedCars: UsedCar[] = [...mockUsedCars];
  priceRules: PriceRule[] = [...mockPriceRules];
  showrooms = [...mockShowrooms];
  workshops = [...mockWorkshops];
  demoCars = [...mockDemoCars];
  slots = [...mockSlots];
  users = [...mockUsers];
  leads: Lead[] = [...mockLeads];
  offers = [...mockOffers];
  banners = [...mockBanners];
  bookings: Booking[] = [
    {
      id: "book-sample-1",
      user_id: "usr-buyer-1",
      slot_id: "slot-td-demo-h-hazratganj",
      kind: "test_drive",
      status: "confirmed",
      vehicle_info: {
        model_name: "Model H",
        variant_name: "ZX Automatic",
      },
      showroom_or_workshop_name: "Vrooma Flagship Hazratganj",
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      notes: "Test drive at home requested",
      consultant_name: "Rohit Verma",
      created_at: new Date().toISOString(),
    },
    {
      id: "book-sample-2",
      user_id: "usr-buyer-1",
      slot_id: "slot-srv-transport-nagar-1",
      kind: "service",
      status: "confirmed",
      vehicle_info: {
        model_name: "Brand X Service",
        variant_name: "Periodic Maintenance (30k km)",
      },
      showroom_or_workshop_name: "Transport Nagar Workshop",
      starts_at: new Date(new Date(Date.now() + 172800000).setHours(11, 30, 0, 0)).toISOString(),
      ends_at: new Date(new Date(Date.now() + 172800000).setHours(13, 0, 0, 0)).toISOString(),
      notes: "Routine synthetic oil service and brake inspection",
      consultant_name: "Amit Sharma",
      created_at: new Date().toISOString(),
    },
  ];
  tradeInRequests: TradeInRequest[] = [];
  outbox: OutboxMessage[] = [];
  savedCarIds: Set<string> = new Set(["model-h", "uc-1182"]);
  subscribers: Array<{ id: string; email: string; created_at: string }> = [];

  addLead(lead: Lead) {
    this.leads.unshift(lead);
    return lead;
  }

  updateLead(id: string, updates: Partial<Lead>) {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      this.leads[idx] = { ...this.leads[idx], ...updates };
      return this.leads[idx];
    }
    return null;
  }

  addBooking(booking: Booking) {
    this.bookings.unshift(booking);
    // Mark slot as booked
    const slot = this.slots.find((s) => s.id === booking.slot_id);
    if (slot) {
      slot.booked_count += 1;
    }
    return booking;
  }

  updateUser(id: string, updates: Partial<Profile>) {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], ...updates };
      return this.users[idx];
    }
    return null;
  }

  addTradeIn(req: TradeInRequest) {
    this.tradeInRequests.unshift(req);
    return req;
  }

  addOutbox(msg: OutboxMessage) {
    this.outbox.unshift(msg);
    return msg;
  }
}

// Ensure singleton instance across fast refreshes in dev
const globalForStore = globalThis as unknown as { vroomaStore: MemoryStore };
export const memoryStore = globalForStore.vroomaStore || new MemoryStore();
if (process.env.NODE_ENV !== "production") globalForStore.vroomaStore = memoryStore;

