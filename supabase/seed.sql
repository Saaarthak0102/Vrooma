-- seed.sql (Mirrors data/mock/*.ts)

-- 1. Cities
INSERT INTO cities (id, name, state, slug) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Lucknow', 'Uttar Pradesh', 'lucknow'),
  ('c0000001-0000-0000-0000-000000000002', 'Kanpur', 'Uttar Pradesh', 'kanpur')
ON CONFLICT (slug) DO NOTHING;

-- 2. Showrooms & Workshops
INSERT INTO showrooms (id, city_id, name, address, phone, hours) VALUES
  ('s0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Vrooma Flagship Hazratganj', '14/A, MG Marg, Hazratganj, Lucknow, UP 226001', '+91 522 409 8800', '{"Mon - Sat": "09:30 AM - 08:00 PM"}'::jsonb),
  ('s0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Vrooma Experience Center Gomti Nagar', 'Vibhuti Khand, Gomti Nagar, Lucknow, UP 226010', '+91 522 419 9900', '{"Mon - Sat": "09:30 AM - 08:00 PM"}'::jsonb),
  ('s0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'Vrooma Kanpur City Center', 'Mall Road, Near Phoolbagh, Kanpur, UP 208001', '+91 512 301 4400', '{"Mon - Sat": "10:00 AM - 07:30 PM"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO workshops (id, city_id, name, address, phone, bays, hours) VALUES
  ('w0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Vrooma Central Workshop Transport Nagar', 'Plot 42, Phase 1, Transport Nagar, Lucknow, UP 226012', '+91 522 450 1122', 16, '{"Mon - Sat": "08:30 AM - 07:00 PM"}'::jsonb),
  ('w0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Vrooma Express Service Alambagh', 'Kanpur Road, Alambagh, Lucknow, UP 226005', '+91 522 450 3344', 8, '{"Mon - Sat": "09:00 AM - 06:30 PM"}'::jsonb)
ON CONFLICT DO NOTHING;

-- 3. Models
INSERT INTO models (id, slug, name, body_type, tagline, hero_image, is_active, is_featured) VALUES
  ('m0000001-0000-0000-0000-000000000001', 'model-h', 'Model H', 'sedan', 'The Benchmark of Executive Elegance & Refinement', '/images/cars/y.svg', true, true),
  ('m0000001-0000-0000-0000-000000000002', 'model-c', 'Model C', 'suv', 'Dominant Presence with Class-Leading Technology', '/images/cars/c.svg', true, false),
  ('m0000001-0000-0000-0000-000000000003', 'model-s', 'Model S', 'hatchback', 'Agile, Fuel-Efficient, Built for Urban Precision', '/images/cars/s.svg', true, false),
  ('m0000001-0000-0000-0000-000000000004', 'model-x', 'Model X', 'ev', 'Next-Gen Electric Performance with 460km Range', '/images/cars/x.svg', true, false),
  ('m0000001-0000-0000-0000-000000000005', 'model-t', 'Model T', 'suv', 'True 4x4 Capability Engineered for Unpaved Horizons', '/images/cars/r.svg', true, false)
ON CONFLICT (slug) DO NOTHING;

-- 4. Variants (Include NEW-H-02 Model H ZX Automatic Petrol ₹12,45,000)
INSERT INTO variants (id, model_id, name, fuel, transmission, ex_showroom, specs, features) VALUES
  ('v0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000001', 'ZX Automatic', 'petrol', 'automatic', 1245000, '{"Engine": "1.5L i-VTEC", "Power": "121 PS"}'::jsonb, '["Electric Sunroof", "LaneWatch Camera", "LED Headlamps"]'::jsonb),
  ('v0000001-0000-0000-0000-000000000002', 'm0000001-0000-0000-0000-000000000001', 'VX Manual', 'petrol', 'manual', 1095000, '{"Engine": "1.5L i-VTEC"}'::jsonb, '["Alloy Wheels 16-inch", "Cruise Control"]'::jsonb),
  ('v0000001-0000-0000-0000-000000000003', 'm0000001-0000-0000-0000-000000000002', 'VX Automatic', 'diesel', 'automatic', 1390000, '{"Engine": "1.5L Turbo Diesel"}'::jsonb, '["Panoramic Sunroof", "Ventilated Front Seats"]'::jsonb),
  ('v0000001-0000-0000-0000-000000000004', 'm0000001-0000-0000-0000-000000000002', 'LX Manual', 'petrol', 'manual', 980000, '{"Engine": "1.2L Turbo"}'::jsonb, '["Dual Airbags", "Rear AC Vents"]'::jsonb),
  ('v0000001-0000-0000-0000-000000000005', 'm0000001-0000-0000-0000-000000000003', 'LX Manual', 'petrol', 'manual', 645000, '{"Engine": "1.2L DualJet"}'::jsonb, '["SmartPlay Audio", "Keyless Entry"]'::jsonb),
  ('v0000001-0000-0000-0000-000000000006', 'm0000001-0000-0000-0000-000000000003', 'ZX AMT CNG', 'cng', 'automatic', 795000, '{"Engine": "1.2L Bi-Fuel"}'::jsonb, '["S-CNG Factory Kit", "Auto AC"]'::jsonb),
  ('v0000001-0000-0000-0000-000000000007', 'm0000001-0000-0000-0000-000000000004', 'Long Range EV', 'ev', 'automatic', 1850000, '{"Battery": "50.3 kWh", "Range": "461 km"}'::jsonb, '["ADAS Level 2", "Dual Screen Cockpit"]'::jsonb),
  ('v0000001-0000-0000-0000-000000000008', 'm0000001-0000-0000-0000-000000000005', '4x4 Hardtop AT', 'diesel', 'automatic', 1680000, '{"Engine": "2.2L mHawk", "Torque": "300 Nm"}'::jsonb, '["Mechanical Locking Diff", "Roll Cage"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 5. Used Cars (Include UC-1182 and UC-1190 Booked)
INSERT INTO used_cars (id, stock_id, model_id, variant_name, fuel, year, km, owners, price, status, reg_no_private, reg_no_masked, certified, images) VALUES
  ('u0000001-0000-0000-0000-000000000001', 'UC-1182', 'm0000001-0000-0000-0000-000000000002', 'VX', 'diesel', 2022, 41200, 1, 845000, 'available', 'UP32BC4120', 'UP32 ** **** 4120', true, '["/images/cars/c.svg"]'::jsonb),
  ('u0000001-0000-0000-0000-000000000002', 'UC-1190', 'm0000001-0000-0000-0000-000000000003', 'LX', 'petrol', 2021, 58600, 1, 512000, 'booked', 'UP32DZ5860', 'UP32 ** **** 5860', true, '["/images/cars/s.svg"]'::jsonb)
ON CONFLICT (stock_id) DO NOTHING;

-- 6. Price Rules (seed values)
INSERT INTO price_rules (id, city_id, model_id, variant_id, road_tax_pct, registration, insurance, handling, accessories, tcs_pct, valid_from, valid_until, notes) VALUES
  ('p0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'm0000001-0000-0000-0000-000000000001', 'v0000001-0000-0000-0000-000000000001', 10.0, 12000, 42000, 8500, 15000, 1.0, '2026-01-01', '2026-12-31', 'Official Lucknow RTO seed values')
ON CONFLICT DO NOTHING;

