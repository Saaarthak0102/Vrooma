export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          latency_ms: number | null
          lead_id: string | null
          prompt: string | null
          response: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          prompt?: string | null
          response?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          prompt?: string | null
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "my_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_rule_consultants: {
        Row: {
          consultant_id: string
          created_at: string
          rule_id: string
        }
        Insert: {
          consultant_id: string
          created_at?: string
          rule_id: string
        }
        Update: {
          consultant_id?: string
          created_at?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_rule_consultants_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_rule_consultants_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_rule_consultants_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "assignment_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model_id: string | null
          priority: number
          showroom_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model_id?: string | null
          priority?: number
          showroom_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model_id?: string | null
          priority?: number
          showroom_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_rules_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_rules_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string
          href: string
          id: string
          image_url: string
          is_active: boolean
          sort: number
          title: string
          title_hi: string | null
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          image_url: string
          is_active?: boolean
          sort?: number
          title: string
          title_hi?: string | null
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort?: number
          title?: string
          title_hi?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          consent_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          kind: Database["public"]["Enums"]["booking_kind_type"]
          lead_id: string | null
          notes: string | null
          pincode: string | null
          ref: string
          rescheduled_from: string | null
          service_type_id: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status_type"]
          updated_at: string
          user_id: string | null
          vehicle_info: Json
        }
        Insert: {
          address?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          consent_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind: Database["public"]["Enums"]["booking_kind_type"]
          lead_id?: string | null
          notes?: string | null
          pincode?: string | null
          ref: string
          rescheduled_from?: string | null
          service_type_id?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status_type"]
          updated_at?: string
          user_id?: string | null
          vehicle_info?: Json
        }
        Update: {
          address?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          consent_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          kind?: Database["public"]["Enums"]["booking_kind_type"]
          lead_id?: string | null
          notes?: string | null
          pincode?: string | null
          ref?: string
          rescheduled_from?: string | null
          service_type_id?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status_type"]
          updated_at?: string
          user_id?: string | null
          vehicle_info?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bookings_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "current_consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookings_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookings_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "my_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          caller_hash: string | null
          caller_masked: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          external_id: string | null
          handled_by: string | null
          id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          source: string
          started_at: string
          workshop_id: string | null
        }
        Insert: {
          caller_hash?: string | null
          caller_masked?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          external_id?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          source?: string
          started_at?: string
          workshop_id?: string | null
        }
        Update: {
          caller_hash?: string | null
          caller_masked?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          external_id?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
          source?: string
          started_at?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          ai_context: Json
          assigned_to: string | null
          created_at: string
          first_staff_reply_at: string | null
          guest_token: string | null
          handoff_at: string | null
          id: string
          last_message_at: string
          lead_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          ai_context?: Json
          assigned_to?: string | null
          created_at?: string
          first_staff_reply_at?: string | null
          guest_token?: string | null
          handoff_at?: string | null
          id?: string
          last_message_at?: string
          lead_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Update: {
          ai_context?: Json
          assigned_to?: string | null
          created_at?: string
          first_staff_reply_at?: string | null
          guest_token?: string | null
          handoff_at?: string | null
          id?: string
          last_message_at?: string
          lead_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "my_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          policy_version: string
          purpose: Database["public"]["Enums"]["consent_purpose_type"]
          source: Database["public"]["Enums"]["consent_source_type"]
          subject_email: string | null
          subject_phone: string | null
          text_hash: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: string
          policy_version?: string
          purpose: Database["public"]["Enums"]["consent_purpose_type"]
          source?: Database["public"]["Enums"]["consent_source_type"]
          subject_email?: string | null
          subject_phone?: string | null
          text_hash?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          policy_version?: string
          purpose?: Database["public"]["Enums"]["consent_purpose_type"]
          source?: Database["public"]["Enums"]["consent_source_type"]
          subject_email?: string | null
          subject_phone?: string | null
          text_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_availability: {
        Row: {
          is_available: boolean
          profile_id: string
          until: string | null
          updated_at: string
        }
        Insert: {
          is_available?: boolean
          profile_id: string
          until?: string | null
          updated_at?: string
        }
        Update: {
          is_available?: boolean
          profile_id?: string
          until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_availability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_availability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_imports: {
        Row: {
          created_at: string
          errors: Json
          filename: string
          id: string
          imported_by: string | null
          leads_created: number
          rows_count: number
        }
        Insert: {
          created_at?: string
          errors?: Json
          filename: string
          id?: string
          imported_by?: string | null
          leads_created?: number
          rows_count?: number
        }
        Update: {
          created_at?: string
          errors?: Json
          filename?: string
          id?: string
          imported_by?: string | null
          leads_created?: number
          rows_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "csv_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_requests: {
        Row: {
          created_at: string
          due_at: string
          id: string
          kind: Database["public"]["Enums"]["data_request_kind"]
          note: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["data_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string
          id?: string
          kind: Database["public"]["Enums"]["data_request_kind"]
          note?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["data_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["data_request_kind"]
          note?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["data_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_cars: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          reg_label: string
          showroom_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          reg_label: string
          showroom_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          reg_label?: string
          showroom_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_cars_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_cars_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          endpoint: string
          key: string
          response: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          key: string
          response: Json
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          key?: string
          response?: Json
          user_id?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          lead_id: string
          payload: Json
          type: Database["public"]["Enums"]["lead_event_type"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          payload?: Json
          type: Database["public"]["Enums"]["lead_event_type"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          payload?: Json
          type?: Database["public"]["Enums"]["lead_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "my_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_draft: string | null
          ai_summary: string | null
          assigned_at: string | null
          assigned_to: string | null
          consent_id: string | null
          created_at: string
          email: string | null
          first_contacted_at: string | null
          id: string
          internal_notes: string | null
          lost_reason: string | null
          message: string | null
          model_id: string | null
          name: string
          phone: string
          ref: string
          showroom_id: string
          sla_breached_at: string | null
          sla_due_at: string
          source: Database["public"]["Enums"]["lead_source_type"]
          source_ref: string | null
          status: Database["public"]["Enums"]["lead_status_type"]
          status_changed_at: string | null
          updated_at: string
          used_car_id: string | null
          user_id: string | null
        }
        Insert: {
          ai_draft?: string | null
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          consent_id?: string | null
          created_at?: string
          email?: string | null
          first_contacted_at?: string | null
          id?: string
          internal_notes?: string | null
          lost_reason?: string | null
          message?: string | null
          model_id?: string | null
          name: string
          phone: string
          ref: string
          showroom_id: string
          sla_breached_at?: string | null
          sla_due_at?: string
          source?: Database["public"]["Enums"]["lead_source_type"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["lead_status_type"]
          status_changed_at?: string | null
          updated_at?: string
          used_car_id?: string | null
          user_id?: string | null
        }
        Update: {
          ai_draft?: string | null
          ai_summary?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          consent_id?: string | null
          created_at?: string
          email?: string | null
          first_contacted_at?: string | null
          id?: string
          internal_notes?: string | null
          lost_reason?: string | null
          message?: string | null
          model_id?: string | null
          name?: string
          phone?: string
          ref?: string
          showroom_id?: string
          sla_breached_at?: string | null
          sla_due_at?: string
          source?: Database["public"]["Enums"]["lead_source_type"]
          source_ref?: string | null
          status?: Database["public"]["Enums"]["lead_status_type"]
          status_changed_at?: string | null
          updated_at?: string
          used_car_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "current_consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_used_car_id_fkey"
            columns: ["used_car_id"]
            isOneToOne: false
            referencedRelation: "used_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_outbox: {
        Row: {
          attempts: number
          body: string
          booking_id: string | null
          channel: Database["public"]["Enums"]["message_channel_type"]
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          lead_id: string | null
          next_attempt_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status_type"]
          template: string
          to_address: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          body: string
          booking_id?: string | null
          channel: Database["public"]["Enums"]["message_channel_type"]
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          lead_id?: string | null
          next_attempt_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status_type"]
          template: string
          to_address: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string
          booking_id?: string | null
          channel?: Database["public"]["Enums"]["message_channel_type"]
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          lead_id?: string | null
          next_attempt_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status_type"]
          template?: string
          to_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_outbox_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_outbox_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_outbox_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "my_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"]
          created_at: string
          gallery: Json
          hero_image: string
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          slug: string
          tagline: string
          tagline_hi: string | null
          updated_at: string
        }
        Insert: {
          body_type: Database["public"]["Enums"]["body_type"]
          created_at?: string
          gallery?: Json
          hero_image: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          slug: string
          tagline: string
          tagline_hi?: string | null
          updated_at?: string
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"]
          created_at?: string
          gallery?: Json
          hero_image?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          slug?: string
          tagline?: string
          tagline_hi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          consent_id: string | null
          created_at: string
          email: string
          id: string
          unsubscribe_token: string
          unsubscribed_at: string | null
        }
        Insert: {
          consent_id?: string | null
          created_at?: string
          email: string
          id?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Update: {
          consent_id?: string | null
          created_at?: string
          email?: string
          id?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "current_consents"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          badge: string | null
          body: string
          body_hi: string | null
          created_at: string
          id: string
          is_active: boolean
          model_id: string | null
          title: string
          title_hi: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          badge?: string | null
          body: string
          body_hi?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_id?: string | null
          title: string
          title_hi?: string | null
          valid_from?: string
          valid_until: string
        }
        Update: {
          badge?: string | null
          body?: string
          body_hi?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_id?: string | null
          title?: string
          title_hi?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          accessories: number
          city_id: string
          created_at: string
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          handling: number
          id: string
          insurance: number
          model_id: string | null
          notes: string | null
          registration: number
          road_tax_pct: number
          scope_key: string
          tcs_pct: number
          updated_at: string
          valid_from: string
          valid_until: string
          variant_id: string | null
        }
        Insert: {
          accessories?: number
          city_id: string
          created_at?: string
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          handling?: number
          id?: string
          insurance: number
          model_id?: string | null
          notes?: string | null
          registration: number
          road_tax_pct: number
          scope_key?: string
          tcs_pct?: number
          updated_at?: string
          valid_from: string
          valid_until: string
          variant_id?: string | null
        }
        Update: {
          accessories?: number
          city_id?: string
          created_at?: string
          fuel?: Database["public"]["Enums"]["fuel_type"] | null
          handling?: number
          id?: string
          insurance?: number
          model_id?: string | null
          notes?: string | null
          registration?: number
          road_tax_pct?: number
          scope_key?: string
          tcs_pct?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymised_at: string | null
          city_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          locale: string
          onboarding_completed_at: string | null
          phone: string | null
          phone_verified_at: string | null
          preferred_showroom_id: string | null
          role: Database["public"]["Enums"]["role_type"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          anonymised_at?: string | null
          city_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          locale?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          preferred_showroom_id?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          anonymised_at?: string | null
          city_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          locale?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          preferred_showroom_id?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_city"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_pref_showroom"
            columns: ["preferred_showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          model_id: string | null
          used_car_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id?: string | null
          used_car_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string | null
          used_car_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_used_car_id_fkey"
            columns: ["used_car_id"]
            isOneToOne: false
            referencedRelation: "used_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          created_at: string
          duration_min: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      showroom_closures: {
        Row: {
          closed_date: string
          created_at: string
          facility_id: string
          facility_type: string
          id: string
          reason: string
        }
        Insert: {
          closed_date: string
          created_at?: string
          facility_id: string
          facility_type: string
          id?: string
          reason: string
        }
        Update: {
          closed_date?: string
          created_at?: string
          facility_id?: string
          facility_type?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      showrooms: {
        Row: {
          address: string
          city_id: string
          created_at: string
          hours: Json
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address: string
          city_id: string
          created_at?: string
          hours?: Json
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string
          city_id?: string
          created_at?: string
          hours?: Json
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "showrooms_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          booked_count: number
          capacity: number
          created_at: string
          demo_car_id: string | null
          ends_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["booking_kind_type"]
          resource_id: string | null
          showroom_id: string | null
          starts_at: string
          workshop_id: string | null
        }
        Insert: {
          booked_count?: number
          capacity?: number
          created_at?: string
          demo_car_id?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["booking_kind_type"]
          resource_id?: string | null
          showroom_id?: string | null
          starts_at: string
          workshop_id?: string | null
        }
        Update: {
          booked_count?: number
          capacity?: number
          created_at?: string
          demo_car_id?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["booking_kind_type"]
          resource_id?: string | null
          showroom_id?: string | null
          starts_at?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slots_demo_car_id_fkey"
            columns: ["demo_car_id"]
            isOneToOne: false
            referencedRelation: "demo_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_showrooms: {
        Row: {
          created_at: string
          is_primary: boolean
          profile_id: string
          showroom_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          profile_id: string
          showroom_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          profile_id?: string
          showroom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_staff_showrooms_showroom"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_showrooms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_showrooms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_in_requests: {
        Row: {
          condition: string
          created_at: string
          id: string
          km: number
          lead_id: string | null
          make: string
          model: string
          notes: string | null
          photos: Json
          user_id: string | null
          year: number
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          km: number
          lead_id?: string | null
          make: string
          model: string
          notes?: string | null
          photos?: Json
          user_id?: string | null
          year: number
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          km?: number
          lead_id?: string | null
          make?: string
          model?: string
          notes?: string | null
          photos?: Json
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "trade_in_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "my_enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_in_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      used_car_price_suggestions: {
        Row: {
          confidence: number | null
          generated_at: string
          id: string
          stock_id: string
          suggested_max: number
          suggested_min: number
        }
        Insert: {
          confidence?: number | null
          generated_at?: string
          id?: string
          stock_id: string
          suggested_max: number
          suggested_min: number
        }
        Update: {
          confidence?: number | null
          generated_at?: string
          id?: string
          stock_id?: string
          suggested_max?: number
          suggested_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "used_car_price_suggestions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "used_cars"
            referencedColumns: ["stock_id"]
          },
        ]
      }
      used_car_sales_history: {
        Row: {
          created_at: string
          fuel: Database["public"]["Enums"]["fuel_type"]
          id: string
          km: number
          model_name: string
          sold_date: string
          sold_price: number
          year: number
        }
        Insert: {
          created_at?: string
          fuel: Database["public"]["Enums"]["fuel_type"]
          id?: string
          km: number
          model_name: string
          sold_date?: string
          sold_price: number
          year: number
        }
        Update: {
          created_at?: string
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          km?: number
          model_name?: string
          sold_date?: string
          sold_price?: number
          year?: number
        }
        Relationships: []
      }
      used_cars: {
        Row: {
          certified: boolean
          created_at: string
          fuel: Database["public"]["Enums"]["fuel_type"]
          id: string
          images: Json
          inspection: Json
          inspection_score: number | null
          km: number
          listed_at: string
          model_id: string | null
          model_name: string
          owners: number
          price: number
          reg_no_masked: string | null
          reg_no_private: string
          showroom_id: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["car_status_type"]
          stock_id: string
          updated_at: string
          variant_name: string
          year: number
        }
        Insert: {
          certified?: boolean
          created_at?: string
          fuel: Database["public"]["Enums"]["fuel_type"]
          id?: string
          images?: Json
          inspection?: Json
          inspection_score?: number | null
          km: number
          listed_at?: string
          model_id?: string | null
          model_name: string
          owners?: number
          price: number
          reg_no_masked?: string | null
          reg_no_private: string
          showroom_id?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["car_status_type"]
          stock_id: string
          updated_at?: string
          variant_name: string
          year: number
        }
        Update: {
          certified?: boolean
          created_at?: string
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          images?: Json
          inspection?: Json
          inspection_score?: number | null
          km?: number
          listed_at?: string
          model_id?: string | null
          model_name?: string
          owners?: number
          price?: number
          reg_no_masked?: string | null
          reg_no_private?: string
          showroom_id?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["car_status_type"]
          stock_id?: string
          updated_at?: string
          variant_name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "used_cars_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_cars_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_colors: {
        Row: {
          created_at: string
          hex: string
          id: string
          image_url: string | null
          name: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          hex: string
          id?: string
          image_url?: string | null
          name: string
          variant_id: string
        }
        Update: {
          created_at?: string
          hex?: string
          id?: string
          image_url?: string | null
          name?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_colors_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          created_at: string
          ex_showroom: number
          features: Json
          fuel: Database["public"]["Enums"]["fuel_type"]
          id: string
          is_active: boolean
          model_id: string
          name: string
          specs: Json
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          ex_showroom: number
          features?: Json
          fuel: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_active?: boolean
          model_id: string
          name: string
          specs?: Json
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          ex_showroom?: number
          features?: Json
          fuel?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_active?: boolean
          model_id?: string
          name?: string
          specs?: Json
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          address: string
          bays: number
          city_id: string
          created_at: string
          hours: Json
          id: string
          is_active: boolean
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address: string
          bays?: number
          city_id: string
          created_at?: string
          hours?: Json
          id?: string
          is_active?: boolean
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string
          bays?: number
          city_id?: string
          created_at?: string
          hours?: Json
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      consultant_public: {
        Row: {
          display_name: string | null
          id: string | null
          role: Database["public"]["Enums"]["role_type"] | null
        }
        Insert: {
          display_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["role_type"] | null
        }
        Update: {
          display_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["role_type"] | null
        }
        Relationships: []
      }
      current_consents: {
        Row: {
          created_at: string | null
          granted: boolean | null
          id: string | null
          policy_version: string | null
          purpose: Database["public"]["Enums"]["consent_purpose_type"] | null
          source: Database["public"]["Enums"]["consent_source_type"] | null
          subject_email: string | null
          subject_phone: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "consultant_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      my_enquiries: {
        Row: {
          consultant_display_name: string | null
          created_at: string | null
          id: string | null
          model_id: string | null
          ref: string | null
          status: Database["public"]["Enums"]["lead_status_type"] | null
          used_car_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_used_car_id_fkey"
            columns: ["used_car_id"]
            isOneToOne: false
            referencedRelation: "used_cars"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["role_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      anonymise_user: { Args: { p_uid: string }; Returns: undefined }
      book_slot: {
        Args: {
          p_address?: string
          p_consent_id?: string
          p_idempotency_key?: string
          p_kind: Database["public"]["Enums"]["booking_kind_type"]
          p_notes?: string
          p_pincode?: string
          p_service_type_id?: string
          p_slot_id: string
          p_vehicle_info?: Json
        }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          consent_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          kind: Database["public"]["Enums"]["booking_kind_type"]
          lead_id: string | null
          notes: string | null
          pincode: string | null
          ref: string
          rescheduled_from: string | null
          service_type_id: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status_type"]
          updated_at: string
          user_id: string | null
          vehicle_info: Json
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_account_deletion: { Args: never; Returns: string }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          consent_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          kind: Database["public"]["Enums"]["booking_kind_type"]
          lead_id: string | null
          notes: string | null
          pincode: string | null
          ref: string
          rescheduled_from: string | null
          service_type_id: string | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status_type"]
          updated_at: string
          user_id: string | null
          vehicle_info: Json
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      complete_profile: {
        Args: {
          p_city_id: string
          p_full_name: string
          p_locale: string
          p_marketing_consent?: boolean
          p_phone: string
          p_policy_version?: string
          p_whatsapp: string
        }
        Returns: {
          anonymised_at: string | null
          city_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          locale: string
          onboarding_completed_at: string | null
          phone: string | null
          phone_verified_at: string | null
          preferred_showroom_id: string | null
          role: Database["public"]["Enums"]["role_type"]
          updated_at: string
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_lead: {
        Args: {
          p_consent_id?: string
          p_email?: string
          p_message?: string
          p_model_id?: string
          p_name: string
          p_phone: string
          p_showroom_id: string
          p_source?: Database["public"]["Enums"]["lead_source_type"]
          p_source_ref?: string
          p_used_car_id?: string
          p_user_id?: string
        }
        Returns: {
          ai_draft: string | null
          ai_summary: string | null
          assigned_at: string | null
          assigned_to: string | null
          consent_id: string | null
          created_at: string
          email: string | null
          first_contacted_at: string | null
          id: string
          internal_notes: string | null
          lost_reason: string | null
          message: string | null
          model_id: string | null
          name: string
          phone: string
          ref: string
          showroom_id: string
          sla_breached_at: string | null
          sla_due_at: string
          source: Database["public"]["Enums"]["lead_source_type"]
          source_ref: string | null
          status: Database["public"]["Enums"]["lead_status_type"]
          status_changed_at: string | null
          updated_at: string
          used_car_id: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      flag_sla_breaches: { Args: never; Returns: number }
      generate_slots: {
        Args: { p_days?: number; p_start_date?: string }
        Returns: number
      }
      get_call_metrics: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_cron_status: {
        Args: never
        Returns: {
          active: boolean
          jobname: string
          last_message: string
          last_run_at: string
          last_status: string
          schedule: string
        }[]
      }
      get_leak_metrics: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      get_onroad_breakup: {
        Args: { p_city_id: string; p_variant_id: string }
        Returns: Json
      }
      get_onroad_teaser: {
        Args: { p_city_id: string; p_variant_id: string }
        Returns: Json
      }
      get_used_car_reg: { Args: { p_stock_id: string }; Returns: string }
      reassign_lead: {
        Args: {
          p_lead_id: string
          p_reason?: string
          p_to_consultant_id: string
        }
        Returns: {
          ai_draft: string | null
          ai_summary: string | null
          assigned_at: string | null
          assigned_to: string | null
          consent_id: string | null
          created_at: string
          email: string | null
          first_contacted_at: string | null
          id: string
          internal_notes: string | null
          lost_reason: string | null
          message: string | null
          model_id: string | null
          name: string
          phone: string
          ref: string
          showroom_id: string
          sla_breached_at: string | null
          sla_due_at: string
          source: Database["public"]["Enums"]["lead_source_type"]
          source_ref: string | null
          status: Database["public"]["Enums"]["lead_status_type"]
          status_changed_at: string | null
          updated_at: string
          used_car_id: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_account_deletion: { Args: never; Returns: string }
      resolve_price_rule: {
        Args: {
          p_city_id: string
          p_date?: string
          p_fuel?: Database["public"]["Enums"]["fuel_type"]
          p_model_id?: string
          p_variant_id?: string
        }
        Returns: {
          accessories: number
          city_id: string
          created_at: string
          fuel: Database["public"]["Enums"]["fuel_type"] | null
          handling: number
          id: string
          insurance: number
          model_id: string | null
          notes: string | null
          registration: number
          road_tax_pct: number
          scope_key: string
          tcs_pct: number
          updated_at: string
          valid_from: string
          valid_until: string
          variant_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "price_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_lead_status: {
        Args: {
          p_lead_id: string
          p_lost_reason?: string
          p_status: Database["public"]["Enums"]["lead_status_type"]
        }
        Returns: {
          ai_draft: string | null
          ai_summary: string | null
          assigned_at: string | null
          assigned_to: string | null
          consent_id: string | null
          created_at: string
          email: string | null
          first_contacted_at: string | null
          id: string
          internal_notes: string | null
          lost_reason: string | null
          message: string | null
          model_id: string | null
          name: string
          phone: string
          ref: string
          showroom_id: string
          sla_breached_at: string | null
          sla_due_at: string
          source: Database["public"]["Enums"]["lead_source_type"]
          source_ref: string | null
          status: Database["public"]["Enums"]["lead_status_type"]
          status_changed_at: string | null
          updated_at: string
          used_car_id: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      body_type: "sedan" | "suv" | "hatchback" | "ev" | "mpv"
      booking_kind_type: "test_drive" | "service"
      booking_status_type: "confirmed" | "cancelled" | "completed" | "no_show"
      call_outcome: "answered" | "missed" | "voicemail"
      car_status_type: "available" | "booked" | "sold"
      consent_purpose_type:
        | "terms_privacy"
        | "service_contact"
        | "marketing"
        | "newsletter"
        | "lead_contact"
      consent_source_type:
        | "signup"
        | "onboarding"
        | "enquiry"
        | "booking"
        | "newsletter"
        | "trade_in"
      data_request_kind: "export" | "delete" | "opt_out"
      data_request_status:
        | "received"
        | "in_progress"
        | "done"
        | "rejected"
        | "cancelled"
      fuel_type: "petrol" | "diesel" | "cng" | "ev" | "hybrid"
      lead_event_type:
        | "created"
        | "assigned"
        | "reassigned"
        | "contacted"
        | "status_changed"
        | "repeat_enquiry"
        | "sla_breached"
        | "ai_draft_generated"
        | "note_added"
      lead_source_type:
        | "web"
        | "portal"
        | "social"
        | "walkin"
        | "chat"
        | "trade_in"
      lead_status_type:
        | "new"
        | "contacted"
        | "test_drive_booked"
        | "negotiating"
        | "won"
        | "lost"
      message_channel_type: "whatsapp" | "sms" | "email"
      message_status_type:
        | "pending"
        | "sending"
        | "sent"
        | "failed"
        | "dead"
        | "skipped"
      role_type: "buyer" | "consultant" | "manager" | "admin"
      transmission_type: "manual" | "automatic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      body_type: ["sedan", "suv", "hatchback", "ev", "mpv"],
      booking_kind_type: ["test_drive", "service"],
      booking_status_type: ["confirmed", "cancelled", "completed", "no_show"],
      call_outcome: ["answered", "missed", "voicemail"],
      car_status_type: ["available", "booked", "sold"],
      consent_purpose_type: [
        "terms_privacy",
        "service_contact",
        "marketing",
        "newsletter",
        "lead_contact",
      ],
      consent_source_type: [
        "signup",
        "onboarding",
        "enquiry",
        "booking",
        "newsletter",
        "trade_in",
      ],
      data_request_kind: ["export", "delete", "opt_out"],
      data_request_status: [
        "received",
        "in_progress",
        "done",
        "rejected",
        "cancelled",
      ],
      fuel_type: ["petrol", "diesel", "cng", "ev", "hybrid"],
      lead_event_type: [
        "created",
        "assigned",
        "reassigned",
        "contacted",
        "status_changed",
        "repeat_enquiry",
        "sla_breached",
        "ai_draft_generated",
        "note_added",
      ],
      lead_source_type: [
        "web",
        "portal",
        "social",
        "walkin",
        "chat",
        "trade_in",
      ],
      lead_status_type: [
        "new",
        "contacted",
        "test_drive_booked",
        "negotiating",
        "won",
        "lost",
      ],
      message_channel_type: ["whatsapp", "sms", "email"],
      message_status_type: [
        "pending",
        "sending",
        "sent",
        "failed",
        "dead",
        "skipped",
      ],
      role_type: ["buyer", "consultant", "manager", "admin"],
      transmission_type: ["manual", "automatic"],
    },
  },
} as const
