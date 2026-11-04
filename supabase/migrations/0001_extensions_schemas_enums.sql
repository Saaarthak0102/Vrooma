-- 0001_extensions_schemas_enums.sql
-- Phase 2 Database: Extensions, Private Schema, and Domain Enums

BEGIN;

-- 1. Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. Schemas: public (exposed to PostgREST/client) and private (internal helpers)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;

-- 3. Generic timestamp trigger function
CREATE OR REPLACE FUNCTION private.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Domain Enumerations
DO $$ BEGIN
  CREATE TYPE role_type AS ENUM ('buyer', 'consultant', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status_type AS ENUM ('new', 'contacted', 'test_drive_booked', 'negotiating', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_source_type AS ENUM ('web', 'portal', 'social', 'walkin', 'chat', 'trade_in');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_kind_type AS ENUM ('test_drive', 'service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status_type AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE car_status_type AS ENUM ('available', 'booked', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'cng', 'ev', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transmission_type AS ENUM ('manual', 'automatic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE body_type AS ENUM ('sedan', 'suv', 'hatchback', 'ev', 'mpv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_purpose_type AS ENUM (
    'terms_privacy',
    'service_contact',
    'marketing',
    'newsletter',
    'lead_contact'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_source_type AS ENUM (
    'signup',
    'onboarding',
    'enquiry',
    'booking',
    'newsletter',
    'trade_in'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_status_type AS ENUM ('pending', 'sending', 'sent', 'failed', 'dead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_channel_type AS ENUM ('whatsapp', 'sms', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE data_request_kind AS ENUM ('export', 'delete', 'opt_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE data_request_status AS ENUM ('received', 'in_progress', 'done', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_event_type AS ENUM (
    'created',
    'assigned',
    'reassigned',
    'contacted',
    'status_changed',
    'repeat_enquiry',
    'sla_breached',
    'ai_draft_generated',
    'note_added'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

