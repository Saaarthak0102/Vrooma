-- 0001_enums_and_core.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE role_type AS ENUM ('buyer', 'consultant', 'manager', 'admin');
CREATE TYPE lead_status_type AS ENUM ('new', 'contacted', 'test_drive_booked', 'negotiating', 'won', 'lost');
CREATE TYPE lead_source_type AS ENUM ('web', 'portal', 'social', 'walkin', 'chat', 'trade_in');
CREATE TYPE booking_kind_type AS ENUM ('test_drive', 'service');
CREATE TYPE booking_status_type AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE car_status_type AS ENUM ('available', 'booked', 'sold');
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'cng', 'ev', 'hybrid');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic');

-- Core Geographic & Dealership Facility Tables
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS showrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  bays INT NOT NULL DEFAULT 8,
  hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

