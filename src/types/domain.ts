import { PriceLine, OnRoadBreakup } from "@/lib/price-engine";

export type Role = "buyer" | "consultant" | "manager" | "admin";

export type LeadStatus =
  | "new"
  | "contacted"
  | "test_drive_booked"
  | "negotiating"
  | "won"
  | "lost";

export type LeadSource =
  | "web"
  | "portal"
  | "social"
  | "walkin"
  | "chat"
  | "trade_in";

export type BookingKind = "test_drive" | "service";

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export type CarStatus = "available" | "booked" | "sold";

export type FuelType = "petrol" | "diesel" | "cng" | "ev" | "hybrid";

export type TransmissionType = "manual" | "automatic";

export type BodyType = "sedan" | "suv" | "hatchback" | "ev" | "mpv";

export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
}

export interface Showroom {
  id: string;
  city_id: string;
  name: string;
  address: string;
  phone: string;
  hours: Record<string, string>;
  lat: number;
  lng: number;
}

export interface Workshop {
  id: string;
  city_id: string;
  name: string;
  address: string;
  phone: string;
  bays: number;
  hours: Record<string, string>;
}

export interface VariantColor {
  id: string;
  variant_id: string;
  name: string;
  hex: string;
  image_url: string;
}

export interface Variant {
  id: string;
  model_id: string;
  name: string;
  fuel: FuelType;
  transmission: TransmissionType;
  ex_showroom: number; // Integer INR
  specs: Record<string, string>;
  features: string[];
  colors?: VariantColor[];
}

export interface Model {
  id: string;
  slug: string;
  name: string;
  body_type: BodyType;
  tagline: string;
  hero_image: string;
  gallery: string[];
  is_active: boolean;
  is_featured?: boolean;
  created_at?: string;
  min_price?: number;
  max_price?: number;
  variants?: Variant[];
}

export interface PriceRule {
  id: string;
  city_id: string;
  model_id?: string | null;
  variant_id?: string | null;
  fuel?: FuelType | null;
  road_tax_pct: number;
  registration: number;
  insurance: number;
  handling: number;
  accessories: number;
  tcs_pct?: number | null;
  valid_from: string; // YYYY-MM-DD
  valid_until: string; // YYYY-MM-DD
  notes?: string | null;
}

export interface InspectionCheck {
  category: string;
  item: string;
  status: "pass" | "fail" | "attention";
  notes?: string;
}

export interface Inspection {
  score: number; // e.g. 96 out of 100
  totalChecks: number; // e.g. 140
  date: string;
  inspector: string;
  checks: InspectionCheck[];
  summary: string;
}

export interface UsedCar {
  id: string;
  stock_id: string; // e.g. UC-1182
  model_id: string;
  model_name: string;
  variant_name: string;
  fuel: FuelType;
  transmission: TransmissionType;
  year: number;
  km: number;
  owners: number;
  price: number; // Integer INR
  status: CarStatus;
  reg_no_masked: string; // UP32 ** **** 1234
  reg_no_private?: string; // Hidden from public
  showroom_id: string;
  inspection: Inspection;
  certified: boolean;
  images: string[];
  listed_at?: string;
  created_at?: string;
}

export interface DemoCar {
  id: string;
  showroom_id: string;
  variant_id: string;
  variant_name: string;
  reg_label: string;
  active: boolean;
}

export interface Slot {
  id: string;
  kind: BookingKind;
  showroom_id?: string | null;
  workshop_id?: string | null;
  demo_car_id?: string | null;
  starts_at: string; // ISO
  ends_at: string; // ISO
  capacity: number;
  booked_count: number;
}

export interface Booking {
  id: string;
  user_id: string;
  slot_id: string;
  kind: BookingKind;
  status: BookingStatus;
  vehicle_info: {
    model_name: string;
    variant_name?: string;
    reg_no?: string;
  };
  showroom_or_workshop_name: string;
  starts_at: string;
  ends_at: string;
  notes?: string;
  consultant_name?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  source: LeadSource;
  user_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  showroom_id: string;
  model_id?: string | null;
  used_car_id?: string | null;
  model_name?: string;
  message?: string | null;
  status: LeadStatus;
  assigned_to?: string | null;
  assigned_consultant_name?: string | null;
  sla_due_at: string;
  first_contacted_at?: string | null;
  ai_summary?: string | null;
  ai_draft?: string | null;
  consent_id?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  pincode?: string | null;
  city_id?: string | null;
  role: Role;
  locale: "en" | "hi";
  is_active?: boolean;
  onboarding_completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Offer {
  id: string;
  title: string;
  body: string;
  badge?: string;
  model_id?: string | null;
  valid_until: string;
  active: boolean;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  href: string;
  sort: number;
  active: boolean;
}

export interface TradeInRequest {
  id: string;
  user_id?: string | null;
  lead_id?: string | null;
  make: string;
  model: string;
  year: number;
  km: number;
  condition: "excellent" | "good" | "fair";
  notes?: string;
  images?: string[];
  estimated_range?: { min: number; max: number };
  created_at: string;
}

export interface OutboxMessage {
  id: string;
  channel: "whatsapp" | "sms" | "email";
  to_phone_or_email: string;
  template: string;
  body: string;
  lead_id?: string | null;
  status: "queued" | "sent" | "failed";
  created_at: string;
}

export interface AiLog {
  id: string;
  kind: "lead_reply" | "buyer_summary" | "used_car_band";
  lead_id?: string | null;
  prompt_hash: string;
  draft: string;
  final_sent?: string | null;
  edited: boolean;
  model: string;
  created_at: string;
}

export type { PriceLine, OnRoadBreakup };

