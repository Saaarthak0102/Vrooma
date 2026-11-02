import {
  Role,
  LeadStatus,
  LeadSource,
  BookingKind,
  BookingStatus,
  CarStatus,
  FuelType,
  TransmissionType,
  BodyType,
} from "./domain";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string;
          name: string;
          state: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cities"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["cities"]["Insert"]>;
      };
      showrooms: {
        Row: {
          id: string;
          city_id: string;
          name: string;
          address: string;
          phone: string;
          hours: Json;
          lat: number;
          lng: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["showrooms"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["showrooms"]["Insert"]>;
      };
      models: {
        Row: {
          id: string;
          slug: string;
          name: string;
          body_type: BodyType;
          tagline: string;
          hero_image: string;
          gallery: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["models"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["models"]["Insert"]>;
      };
      variants: {
        Row: {
          id: string;
          model_id: string;
          name: string;
          fuel: FuelType;
          transmission: TransmissionType;
          ex_showroom: number;
          specs: Json;
          features: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["variants"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["variants"]["Insert"]>;
      };
      price_rules: {
        Row: {
          id: string;
          city_id: string;
          model_id: string | null;
          variant_id: string | null;
          fuel: FuelType | null;
          road_tax_pct: number;
          registration: number;
          insurance: number;
          handling: number;
          accessories: number;
          tcs_pct: number | null;
          valid_from: string;
          valid_until: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["price_rules"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["price_rules"]["Insert"]>;
      };
      used_cars: {
        Row: {
          id: string;
          stock_id: string;
          model_id: string;
          variant_name: string;
          fuel: FuelType;
          year: number;
          km: number;
          owners: number;
          price: number;
          status: CarStatus;
          reg_no_private: string;
          reg_no_masked: string;
          showroom_id: string;
          inspection: Json;
          certified: boolean;
          images: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["used_cars"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["used_cars"]["Insert"]>;
      };
      leads: {
        Row: {
          id: string;
          source: LeadSource;
          user_id: string | null;
          name: string;
          phone: string;
          email: string | null;
          showroom_id: string;
          model_id: string | null;
          used_car_id: string | null;
          message: string | null;
          status: LeadStatus;
          assigned_to: string | null;
          sla_due_at: string;
          first_contacted_at: string | null;
          ai_summary: string | null;
          ai_draft: string | null;
          consent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
    };
  };
}

