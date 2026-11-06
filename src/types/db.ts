/**
 * src/types/db.ts
 *
 * Master Supabase Database Definitions for Vrooma.
 * Generated to match Migrations 0001 through 0013.
 */

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

export type OptionalNullable<T> = {
  [K in keyof T as null extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as null extends T[K] ? never : K]: T[K];
};

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
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["cities"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cities"]["Insert"]>;
        Relationships: [];
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["showrooms"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["showrooms"]["Insert"]>;
        Relationships: [];
      };
      workshops: {
        Row: {
          id: string;
          city_id: string;
          name: string;
          address: string;
          phone: string;
          bays: number;
          hours: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["workshops"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workshops"]["Insert"]>;
        Relationships: [];
      };
      showroom_closures: {
        Row: {
          id: string;
          facility_type: "showroom" | "workshop";
          facility_id: string;
          closed_date: string;
          reason: string;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["showroom_closures"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["showroom_closures"]["Insert"]>;
        Relationships: [];
      };
      models: {
        Row: {
          id: string;
          slug: string;
          name: string;
          body_type: BodyType;
          tagline: string;
          tagline_hi: string | null;
          hero_image: string;
          gallery: Json;
          is_active: boolean;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["models"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["models"]["Insert"]>;
        Relationships: [];
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
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["variants"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["variants"]["Insert"]>;
        Relationships: [];
      };
      variant_colors: {
        Row: {
          id: string;
          variant_id: string;
          name: string;
          name_hi: string | null;
          hex: string;
          image_url: string;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["variant_colors"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["variant_colors"]["Insert"]>;
        Relationships: [];
      };
      price_rules: {
        Row: {
          id: string;
          city_id: string;
          model_id: string | null;
          variant_id: string | null;
          fuel: FuelType | null;
          scope_key: string;
          road_tax_pct: number;
          registration: number;
          insurance: number;
          handling: number;
          accessories: number;
          tcs_pct: number;
          valid_from: string;
          valid_until: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["price_rules"]["Row"], "id" | "scope_key" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["price_rules"]["Insert"]>;
        Relationships: [];
      };
      used_cars: {
        Row: {
          id: string;
          stock_id: string;
          model_id: string | null;
          model_name: string;
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
          certified: boolean;
          inspection: Json;
          inspection_score: number | null;
          images: Json;
          listed_at: string;
          sold_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["used_cars"]["Row"], "id" | "reg_no_masked" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["used_cars"]["Insert"]>;
        Relationships: [];
      };
      used_car_sales_history: {
        Row: {
          id: string;
          model_name: string;
          year: number;
          fuel: FuelType;
          km: number;
          sold_price: number;
          sold_date: string;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["used_car_sales_history"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["used_car_sales_history"]["Insert"]>;
        Relationships: [];
      };
      used_car_price_suggestions: {
        Row: {
          id: string;
          stock_id: string;
          suggested_min: number;
          suggested_max: number;
          confidence: number | null;
          generated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["used_car_price_suggestions"]["Row"], "id" | "generated_at">> & {
          id?: string;
          generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["used_car_price_suggestions"]["Insert"]>;
        Relationships: [];
      };
      demo_cars: {
        Row: {
          id: string;
          showroom_id: string;
          variant_id: string;
          reg_label: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["demo_cars"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["demo_cars"]["Insert"]>;
        Relationships: [];
      };
      service_types: {
        Row: {
          id: string;
          name: string;
          duration_min: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["service_types"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_types"]["Insert"]>;
        Relationships: [];
      };
      slots: {
        Row: {
          id: string;
          kind: BookingKind;
          showroom_id: string | null;
          workshop_id: string | null;
          demo_car_id: string | null;
          resource_id: string;
          starts_at: string;
          ends_at: string;
          capacity: number;
          booked_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["slots"]["Row"], "id" | "resource_id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["slots"]["Insert"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          ref: string;
          user_id: string | null;
          slot_id: string;
          kind: BookingKind;
          status: BookingStatus;
          vehicle_info: Json;
          service_type_id: string | null;
          notes: string | null;
          consent_id: string | null;
          lead_id: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          rescheduled_from: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at" | "updated_at">> & {
          ref?: string;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      idempotency_keys: {
        Row: {
          user_id: string;
          key: string;
          endpoint: string;
          response: Json;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["idempotency_keys"]["Row"];
        Update: Partial<Database["public"]["Tables"]["idempotency_keys"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          phone: string | null;
          whatsapp: string | null;
          phone_verified_at: string | null;
          city_id: string | null;
          preferred_showroom_id: string | null;
          locale: "en" | "hi";
          role: Role;
          is_active: boolean;
          address: string | null;
          pincode: string | null;
          onboarding_completed_at: string | null;
          deleted_at: string | null;
          anonymised_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      staff_showrooms: {
        Row: {
          profile_id: string;
          showroom_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["staff_showrooms"]["Row"];
        Update: Partial<Database["public"]["Tables"]["staff_showrooms"]["Insert"]>;
        Relationships: [];
      };
      consultant_availability: {
        Row: {
          profile_id: string;
          is_available: boolean;
          until: string | null;
          updated_at: string;
        };
        Insert: Database["public"]["Tables"]["consultant_availability"]["Row"];
        Update: Partial<Database["public"]["Tables"]["consultant_availability"]["Insert"]>;
        Relationships: [];
      };
      consents: {
        Row: {
          id: string;
          user_id: string | null;
          subject_email: string | null;
          subject_phone: string | null;
          purpose: "terms_privacy" | "service_contact" | "marketing" | "newsletter" | "lead_contact";
          granted: boolean;
          policy_version: string;
          text_hash: string | null;
          source: "signup" | "onboarding" | "enquiry" | "booking" | "newsletter" | "trade_in";
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["consents"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["consents"]["Insert"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          ref: string;
          source: LeadSource;
          source_ref: string | null;
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
          assigned_at: string | null;
          sla_due_at: string;
          first_contacted_at: string | null;
          sla_breached_at: string | null;
          status_changed_at: string | null;
          lost_reason: string | null;
          consent_id: string | null;
          ai_summary: string | null;
          ai_draft: string | null;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at" | "updated_at">> & {
          ref?: string;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      lead_events: {
        Row: {
          id: string;
          lead_id: string;
          type:
            | "created"
            | "assigned"
            | "reassigned"
            | "contacted"
            | "status_changed"
            | "repeat_enquiry"
            | "sla_breached"
            | "ai_draft_generated"
            | "note_added";
          payload: Json;
          actor_id: string | null;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["lead_events"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_events"]["Insert"]>;
        Relationships: [];
      };
      assignment_rules: {
        Row: {
          id: string;
          showroom_id: string;
          model_id: string | null;
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["assignment_rules"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignment_rules"]["Insert"]>;
        Relationships: [];
      };
      assignment_rule_consultants: {
        Row: {
          rule_id: string;
          consultant_id: string;
          created_at: string;
        };
        Insert: Database["public"]["Tables"]["assignment_rule_consultants"]["Row"];
        Update: Partial<Database["public"]["Tables"]["assignment_rule_consultants"]["Insert"]>;
        Relationships: [];
      };
      messages_outbox: {
        Row: {
          id: string;
          channel: "whatsapp" | "sms" | "email";
          to_address: string;
          template: string;
          body: string;
          lead_id: string | null;
          booking_id: string | null;
          status: "pending" | "sending" | "sent" | "failed" | "dead";
          attempts: number;
          next_attempt_at: string;
          last_error: string | null;
          idempotency_key: string;
          created_at: string;
          updated_at: string;
          sent_at: string | null;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["messages_outbox"]["Row"], "id" | "attempts" | "next_attempt_at" | "last_error" | "status" | "created_at" | "updated_at" | "sent_at">> & {
          id?: string;
          status?: "pending" | "sending" | "sent" | "failed" | "dead";
          attempts?: number;
          next_attempt_at?: string;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
          sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages_outbox"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          old_values: Json | null;
          new_values: Json | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["audit_log"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
      rate_limits: {
        Row: {
          key: string;
          window_start: string;
          count: number;
        };
        Insert: Database["public"]["Tables"]["rate_limits"]["Row"];
        Update: Partial<Database["public"]["Tables"]["rate_limits"]["Insert"]>;
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          consent_id: string | null;
          unsubscribed_at: string | null;
          unsubscribe_token: string;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["newsletter_subscribers"]["Row"], "id" | "unsubscribe_token" | "created_at">> & {
          id?: string;
          unsubscribe_token?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Insert"]>;
        Relationships: [];
      };
      csv_imports: {
        Row: {
          id: string;
          filename: string;
          row_count: number;
          imported_by: string | null;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["csv_imports"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["csv_imports"]["Insert"]>;
        Relationships: [];
      };
      ai_logs: {
        Row: {
          id: string;
          prompt: string;
          response: string;
          model: string;
          tokens_used: number;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["ai_logs"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_logs"]["Insert"]>;
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          last_message_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_conversations"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      saved_items: {
        Row: {
          id: string;
          user_id: string;
          model_id: string | null;
          used_car_id: string | null;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["saved_items"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_items"]["Insert"]>;
        Relationships: [];
      };
      trade_in_requests: {
        Row: {
          id: string;
          user_id: string | null;
          lead_id: string | null;
          make: string;
          model: string;
          year: number;
          km: number;
          fuel: FuelType;
          transmission: TransmissionType;
          condition: string;
          photos: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["trade_in_requests"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trade_in_requests"]["Insert"]>;
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          title: string;
          title_hi: string | null;
          body: string;
          body_hi: string | null;
          model_id: string | null;
          badge: string | null;
          valid_from: string;
          valid_until: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["offers"]["Row"], "id" | "created_at" | "updated_at">> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["offers"]["Insert"]>;
        Relationships: [];
      };
      banners: {
        Row: {
          id: string;
          title: string;
          title_hi: string | null;
          image_url: string;
          href: string | null;
          sort: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["banners"]["Row"], "id" | "created_at">> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["banners"]["Insert"]>;
        Relationships: [];
      };
      data_requests: {
        Row: {
          id: string;
          user_id: string;
          kind: "export" | "delete" | "opt_out";
          status: "received" | "in_progress" | "done" | "rejected";
          due_at: string;
          processed_by: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: OptionalNullable<Omit<Database["public"]["Tables"]["data_requests"]["Row"], "id" | "status" | "due_at" | "created_at" | "updated_at">> & {
          id?: string;
          status?: "received" | "in_progress" | "done" | "rejected";
          due_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["data_requests"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      current_consents: {
        Row: {
          id: string;
          user_id: string | null;
          subject_email: string | null;
          subject_phone: string | null;
          purpose: "terms_privacy" | "service_contact" | "marketing" | "newsletter" | "lead_contact";
          granted: boolean;
          policy_version: string;
          source: "signup" | "onboarding" | "enquiry" | "booking" | "newsletter" | "trade_in";
          created_at: string;
        };
        Relationships: [];
      };
      consultant_public: {
        Row: {
          id: string;
          display_name: string;
          role: Role;
        };
        Relationships: [];
      };
      my_enquiries: {
        Row: {
          id: string;
          ref: string;
          model_id: string | null;
          used_car_id: string | null;
          status: LeadStatus;
          created_at: string;
          consultant_display_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      complete_profile: {
        Args: {
          p_full_name: string;
          p_phone: string;
          p_whatsapp?: string | null;
          p_city_id: string;
          p_locale: string;
          p_address?: string | null;
          p_pincode?: string | null;
          p_marketing_consent?: boolean;
          p_policy_version?: string;
        };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      get_onroad_teaser: {
        Args: {
          p_variant_id: string;
          p_city_id: string;
        };
        Returns: {
          total: number;
          valid_until: string;
          is_estimate: boolean;
        } | null;
      };
      get_onroad_breakup: {
        Args: {
          p_variant_id: string;
          p_city_id: string;
        };
        Returns: {
          ex_showroom: number;
          road_tax: number;
          road_tax_pct: number;
          registration: number;
          insurance: number;
          handling: number;
          accessories: number;
          tcs: number;
          total: number;
          valid_from: string;
          valid_until: string;
          notes: string | null;
        } | null;
      };
      resolve_price_rule: {
        Args: {
          p_city_id: string;
          p_variant_id?: string | null;
          p_model_id?: string | null;
          p_fuel?: FuelType | null;
          p_date?: string;
        };
        Returns: Database["public"]["Tables"]["price_rules"]["Row"] | null;
      };
      create_lead: {
        Args: {
          p_name: string;
          p_phone: string;
          p_showroom_id: string;
          p_model_id?: string | null;
          p_used_car_id?: string | null;
          p_email?: string | null;
          p_message?: string | null;
          p_source?: LeadSource;
          p_source_ref?: string | null;
          p_consent_id?: string | null;
          /** Honoured ONLY for the service role (trusted server code); ignored for every other caller. */
          p_user_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["leads"]["Row"];
      };
      book_slot: {
        Args: {
          p_slot_id: string;
          p_kind: BookingKind;
          p_vehicle_info?: Json;
          p_service_type_id?: string | null;
          p_notes?: string | null;
          p_consent_id?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      cancel_booking: {
        Args: {
          p_booking_id: string;
          p_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["bookings"]["Row"];
      };
      reassign_lead: {
        Args: {
          p_lead_id: string;
          p_to_consultant_id: string;
          p_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["leads"]["Row"];
      };
      set_lead_status: {
        Args: {
          p_lead_id: string;
          p_status: LeadStatus;
          p_lost_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["leads"]["Row"];
      };
      flag_sla_breaches: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_cron_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          jobname: string;
          schedule: string;
          active: boolean;
          last_run_at: string | null;
          last_status: string | null;
          last_message: string | null;
        }[];
      };
      generate_slots: {
        Args: {
          p_start_date?: string;
          p_days?: number;
        };
        Returns: number;
      };
      get_leak_metrics: {
        Args: {
          p_from?: string;
          p_to?: string;
        };
        Returns: {
          total_leads: number;
          contacted_in_sla: number;
          sla_compliance_pct: number;
          lost_leads: number;
          estimated_lost_dealer_contribution: number;
        };
      };
      get_used_car_reg: {
        Args: {
          p_stock_id: string;
        };
        Returns: string;
      };
      admin_set_role: {
        Args: {
          p_user_id: string;
          p_new_role: Role;
        };
        Returns: void;
      };
      request_account_deletion: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      anonymise_user: {
        Args: {
          p_uid: string;
        };
        Returns: void;
      };
    };
  };
}
