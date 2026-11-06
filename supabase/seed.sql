-- supabase/seed.sql
-- Vrooma Master Database Seed Data (Mirrors mock dataset, idempotent via ON CONFLICT)
-- All UUID literals strictly conform to valid RFC 4122 hexadecimal syntax [0-9a-fA-F].

BEGIN;

-- =========================================================================
-- 1. GEOGRAPHIC DATA: CITIES
-- =========================================================================
INSERT INTO public.cities (id, name, state, slug) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Lucknow', 'Uttar Pradesh', 'lucknow'),
  ('c0000001-0000-0000-0000-000000000002', 'Kanpur', 'Uttar Pradesh', 'kanpur')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  state = EXCLUDED.state;

-- =========================================================================
-- 2. DEALERSHIP FACILITIES: SHOWROOMS & WORKSHOPS
-- =========================================================================
INSERT INTO public.showrooms (id, city_id, name, address, phone, hours, lat, lng, is_active) VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'Vrooma Flagship Hazratganj',
    '14/A, MG Marg, Hazratganj, Lucknow, UP 226001',
    '+91 522 409 8800',
    '{"Mon - Sat": "09:30 AM - 08:00 PM", "Sunday": "10:00 AM - 06:00 PM"}'::jsonb,
    26.8502, 80.9490, true
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000001',
    'Vrooma Experience Center Gomti Nagar',
    'Vibhuti Khand, Gomti Nagar, Lucknow, UP 226010',
    '+91 522 419 9900',
    '{"Mon - Sat": "09:30 AM - 08:00 PM", "Sunday": "10:00 AM - 06:00 PM"}'::jsonb,
    26.8600, 81.0100, true
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    'c0000001-0000-0000-0000-000000000002',
    'Vrooma Kanpur City Center',
    'Mall Road, Near Phoolbagh, Kanpur, UP 208001',
    '+91 512 301 4400',
    '{"Mon - Sat": "10:00 AM - 07:30 PM", "Sunday": "Closed"}'::jsonb,
    26.4670, 80.3500, true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  hours = EXCLUDED.hours;

INSERT INTO public.workshops (id, city_id, name, address, phone, bays, hours, is_active) VALUES
  (
    'b0000001-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'Central Workshop Transport Nagar',
    'Plot 88, Phase 2, Transport Nagar, Lucknow, UP 226012',
    '+91 522 450 1122',
    16,
    '{"Mon - Sat": "08:30 AM - 07:00 PM", "Sunday": "Closed"}'::jsonb,
    true
  ),
  (
    'b0000001-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000001',
    'Express Service Alambagh',
    'Kanpur Road, Alambagh, Lucknow, UP 226005',
    '+91 522 450 3344',
    8,
    '{"Mon - Sat": "09:00 AM - 06:30 PM", "Sunday": "Closed"}'::jsonb,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  bays = EXCLUDED.bays,
  hours = EXCLUDED.hours;

-- Showroom Closures (Upcoming national/regional holidays)
INSERT INTO public.showroom_closures (id, facility_type, facility_id, closed_date, reason) VALUES
  ('fc000001-0000-0000-0000-000000000001', 'showroom', 'a0000001-0000-0000-0000-000000000001', '2026-08-15', 'Independence Day'),
  ('fc000001-0000-0000-0000-000000000002', 'workshop', 'b0000001-0000-0000-0000-000000000001', '2026-08-15', 'Independence Day')
ON CONFLICT (facility_type, facility_id, closed_date) DO NOTHING;

-- =========================================================================
-- 3. VEHICLE CATALOG: MODELS, VARIANTS, COLORS
-- =========================================================================
INSERT INTO public.models (id, slug, name, body_type, tagline, tagline_hi, hero_image, is_active, is_featured) VALUES
  (
    'd0000001-0000-0000-0000-000000000001', 'model-h', 'Model H', 'sedan',
    'The Benchmark of Executive Elegance & Refinement',
    'कार्यकारी भव्यता और परिष्कार का प्रतीक',
    '/images/cars/y.svg', true, true
  ),
  (
    'd0000001-0000-0000-0000-000000000002', 'model-c', 'Model C', 'suv',
    'Dominant Presence with Class-Leading Technology',
    'अग्रणी तकनीक के साथ प्रभावशाली उपस्थिति',
    '/images/cars/c.svg', true, true
  ),
  (
    'd0000001-0000-0000-0000-000000000003', 'model-s', 'Model S', 'hatchback',
    'Agile, Fuel-Efficient, Built for Urban Precision',
    'सटीक शहरी ड्राइविंग के लिए चुस्त और ईंधन-कुशल',
    '/images/cars/s.svg', true, true
  ),
  (
    'd0000001-0000-0000-0000-000000000004', 'model-x', 'Model X', 'ev',
    'Next-Gen Electric Performance with 460km Range',
    '460 किमी रेंज के साथ अगली पीढ़ी का इलेक्ट्रिक प्रदर्शन',
    '/images/cars/x.svg', true, false
  ),
  (
    'd0000001-0000-0000-0000-000000000005', 'model-t', 'Model T', 'suv',
    'True 4x4 Capability Engineered for Unpaved Horizons',
    'कच्चे रास्तों के लिए निर्मित वास्तविक 4x4 क्षमता',
    '/images/cars/r.svg', true, false
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  body_type = EXCLUDED.body_type,
  tagline = EXCLUDED.tagline,
  tagline_hi = EXCLUDED.tagline_hi,
  hero_image = EXCLUDED.hero_image,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured;

-- Variants (Including NEW-H-02 Model H ZX Automatic Petrol ₹12,45,000)
INSERT INTO public.variants (id, model_id, name, fuel, transmission, ex_showroom, specs, features, is_active) VALUES
  (
    'e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001',
    'ZX Automatic', 'petrol', 'automatic', 1245000,
    '{"Engine": "1.5L i-VTEC DOHC", "Power": "121 PS @ 6600 rpm", "Torque": "145 Nm @ 4300 rpm", "Mileage": "18.4 kmpl"}'::jsonb,
    '["Electric Sunroof", "LaneWatch Camera", "Full LED Headlamps", "Wireless Android Auto / Apple CarPlay", "6 Airbags", "8-speaker Premium Audio"]'::jsonb,
    true
  ),
  (
    'e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001',
    'VX Manual', 'petrol', 'manual', 1095000,
    '{"Engine": "1.5L i-VTEC", "Power": "121 PS", "Torque": "145 Nm", "Mileage": "17.8 kmpl"}'::jsonb,
    '["16-inch Diamond Cut Alloys", "Cruise Control", "Rear View Camera", "Auto Climate Control"]'::jsonb,
    true
  ),
  (
    'e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000002',
    'ZX Automatic', 'diesel', 'automatic', 1390000,
    '{"Engine": "1.5L Turbo Diesel", "Power": "115 PS", "Torque": "250 Nm", "Mileage": "21.2 kmpl"}'::jsonb,
    '["Panoramic Sunroof", "Ventilated Front Seats", "Level 2 ADAS", "10.25-inch Touchscreen"]'::jsonb,
    true
  ),
  (
    'e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000002',
    'LX Manual', 'petrol', 'manual', 980000,
    '{"Engine": "1.2L Turbo", "Power": "110 PS", "Torque": "170 Nm", "Mileage": "16.5 kmpl"}'::jsonb,
    '["Dual Front Airbags", "ESP with Hill Hold", "LED DRLs", "Rear Parking Sensors"]'::jsonb,
    true
  ),
  (
    'e0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000003',
    'ZX AMT DualJet', 'petrol', 'automatic', 785000,
    '{"Engine": "1.2L DualJet Dual VVT", "Power": "90 PS", "Torque": "113 Nm", "Mileage": "22.5 kmpl"}'::jsonb,
    '["9-inch SmartPlay Pro+ Audio", "360 View Camera", "Head Up Display", "Cruise Control"]'::jsonb,
    true
  ),
  (
    'e0000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000003',
    'VX S-CNG Manual', 'cng', 'manual', 745000,
    '{"Engine": "1.2L Bi-Fuel CNG", "Power": "77.5 PS", "Torque": "98.5 Nm", "Mileage": "31.1 km/kg"}'::jsonb,
    '["Factory Fitted S-CNG", "Dual Interdependent ECUs", "Auto AC", "Electrically Foldable ORVMs"]'::jsonb,
    true
  ),
  (
    'e0000001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000004',
    'Max Range 460 AT', 'ev', 'automatic', 1850000,
    '{"Battery": "50.3 kWh Prismatic", "Power": "176 PS", "Torque": "280 Nm", "Range": "461 km (ARAI)"}'::jsonb,
    '["Panoramic Skyroof", "Fast Charging 0-80% in 50 min", "V2L Vehicle-to-Load", "6 Airbags"]'::jsonb,
    true
  ),
  (
    'e0000001-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000005',
    '4x4 Expedition Diesel AT', 'diesel', 'automatic', 1680000,
    '{"Engine": "2.2L mHawk Turbo Diesel", "Power": "130 PS", "Torque": "300 Nm", "Drive": "4x4 with Low Range"}'::jsonb,
    '["Mechanical Locking Differential", "Removable Hard Top", "IP54 Water Resistant Interior", "All-Terrain Tyres"]'::jsonb,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  ex_showroom = EXCLUDED.ex_showroom,
  specs = EXCLUDED.specs,
  features = EXCLUDED.features;

-- Variant Colors
INSERT INTO public.variant_colors (id, variant_id, name, hex, image_url) VALUES
  ('ec000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'Radiant Red Metallic', '#C0292B', '/images/cars/y.svg'),
  ('ec000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'Platinum White Pearl', '#F2F2F2', '/images/cars/y.svg'),
  ('ec000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000001', 'Meteoroid Grey Metallic', '#5A6268', '/images/cars/y.svg'),
  ('ec000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000003', 'Forest Green Pearl', '#2C5E43', '/images/cars/c.svg'),
  ('ec000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000007', 'Arctic Cyan EV', '#1FBF75', '/images/cars/x.svg')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 4. TEST DRIVE DEMO FLEET & SERVICE BAY TYPES
-- =========================================================================
INSERT INTO public.demo_cars (id, showroom_id, variant_id, reg_label, is_active) VALUES
  ('dc000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'UP32 DEMO 01 (Model H ZX AT)', true),
  ('dc000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000003', 'UP32 DEMO 02 (Model C ZX AT)', true),
  ('dc000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'UP32 DEMO 03 (Model H ZX AT)', true),
  ('dc000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000005', 'UP78 DEMO 01 (Model S ZX AMT)', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service_types (id, name, duration_min, is_active) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'Periodic Maintenance Service (PMS)', 90, true),
  ('c0000002-0000-0000-0000-000000000002', 'Express Lube & Oil Service', 45, true),
  ('c0000002-0000-0000-0000-000000000003', 'Wheel Alignment & Balancing', 60, true),
  ('c0000002-0000-0000-0000-000000000004', 'AC Disinfection & Cooling Service', 60, true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 5. CERTIFIED USED CARS INVENTORY (Masked Registration)
-- =========================================================================
INSERT INTO public.used_cars (
  id, stock_id, model_id, model_name, variant_name, fuel, year, km, owners,
  price, status, reg_no_private, showroom_id, certified, inspection,
  inspection_score, images, listed_at
) VALUES
  (
    'f0000001-0000-0000-0000-000000000001', 'UC-1182',
    'd0000001-0000-0000-0000-000000000002', 'Model C', 'ZX Automatic',
    'diesel', 2022, 41200, 1, 845000, 'available', 'UP32BC4120',
    'a0000001-0000-0000-0000-000000000001', true,
    '{"engine": "Excellent", "transmission": "Smooth", "brakes": "85% Pad Life", "tyres": "Good (New in 2024)", "flood_damage": "None", "accidental": "None"}'::jsonb,
    94, '["/images/cars/c.svg"]'::jsonb, NOW() - INTERVAL '4 days'
  ),
  (
    'f0000001-0000-0000-0000-000000000002', 'UC-1190',
    'd0000001-0000-0000-0000-000000000003', 'Model S', 'LX Manual',
    'petrol', 2021, 58600, 1, 512000, 'booked', 'UP32DZ5860',
    'a0000001-0000-0000-0000-000000000001', true,
    '{"engine": "Good", "transmission": "Normal", "flood_damage": "None", "accidental": "None"}'::jsonb,
    88, '["/images/cars/s.svg"]'::jsonb, NOW() - INTERVAL '12 days'
  ),
  (
    'f0000001-0000-0000-0000-000000000003', 'UC-1204',
    'd0000001-0000-0000-0000-000000000001', 'Model H', 'VX Manual',
    'petrol', 2023, 19400, 1, 985000, 'available', 'UP32GH1940',
    'a0000001-0000-0000-0000-000000000002', true,
    '{"engine": "Like New", "brakes": "95%", "flood_damage": "None", "accidental": "None"}'::jsonb,
    98, '["/images/cars/y.svg"]'::jsonb, NOW() - INTERVAL '2 days'
  )
ON CONFLICT (stock_id) DO UPDATE SET
  price = EXCLUDED.price,
  status = EXCLUDED.status,
  km = EXCLUDED.km;

-- Historical Sales Records for AI Valuation Baseline
INSERT INTO public.used_car_sales_history (id, model_name, year, fuel, km, sold_price, sold_date) VALUES
  ('fa000001-0000-0000-0000-000000000001', 'Model C', 2022, 'diesel', 44000, 830000, '2026-01-15'),
  ('fa000001-0000-0000-0000-000000000002', 'Model C', 2022, 'diesel', 38000, 860000, '2026-02-10'),
  ('fa000001-0000-0000-0000-000000000003', 'Model S', 2021, 'petrol', 61000, 495000, '2026-02-18')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 6. OFFICIAL PRICING RULES (Lucknow & Kanpur RTO)
-- =========================================================================
INSERT INTO public.price_rules (
  id, city_id, model_id, variant_id, fuel, road_tax_pct, registration,
  insurance, handling, accessories, tcs_pct, valid_from, valid_until, notes
) VALUES
  (
    '00000009-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000001',
    'e0000001-0000-0000-0000-000000000001',
    'petrol',
    10.00, 12000, 42000, 8500, 15000, 1.00,
    '2026-01-01', '2026-12-31',
    'Official Lucknow RTO Breakup — Model H ZX AT'
  ),
  (
    '00000009-0000-0000-0000-000000000002',
    'c0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000002',
    'e0000001-0000-0000-0000-000000000003',
    'diesel',
    12.00, 14500, 48000, 9500, 18000, 1.00,
    '2026-01-01', '2026-12-31',
    'Official Lucknow RTO Breakup — Model C Diesel'
  ),
  (
    '00000009-0000-0000-0000-000000000003',
    'c0000001-0000-0000-0000-000000000002',
    'd0000001-0000-0000-0000-000000000001',
    'e0000001-0000-0000-0000-000000000001',
    'petrol',
    10.00, 11500, 42000, 8500, 12000, 1.00,
    '2026-01-01', '2026-12-31',
    'Kanpur RTO Breakup — Model H'
  )
ON CONFLICT (id) DO UPDATE SET
  road_tax_pct = EXCLUDED.road_tax_pct,
  insurance = EXCLUDED.insurance,
  accessories = EXCLUDED.accessories;

-- =========================================================================
-- 6b. PRICE RULE COVERAGE: every variant x city, plus a model-level fallback per model and city
-- (same statements as migration 0025; idempotent)
-- =========================================================================
-- Keep the three originally seeded rules valid for the same window as the new ones.
UPDATE public.price_rules
SET valid_until = DATE '2027-03-31', updated_at = pg_catalog.now()
WHERE id IN (
  '00000009-0000-0000-0000-000000000001',
  '00000009-0000-0000-0000-000000000002',
  '00000009-0000-0000-0000-000000000003'
)
AND valid_until = DATE '2026-12-31';

-- 1. Variant-scoped rules: every active variant x {lucknow, kanpur}
INSERT INTO public.price_rules (
  city_id, model_id, variant_id, fuel, road_tax_pct, registration, insurance, handling, accessories,
  tcs_pct, valid_from, valid_until, notes
)
SELECT
  c.id,
  v.model_id,
  v.id,
  v.fuel,
  -- Uttar Pradesh road tax by fuel (EV exempt)
  CASE v.fuel::text WHEN 'petrol' THEN 10.00 WHEN 'diesel' THEN 12.00 WHEN 'cng' THEN 8.00 WHEN 'ev' THEN 0.00 ELSE 6.00 END,
  -- Registration / smart card: Lucknow vs Kanpur RTO, diesel carries a surcharge
  (CASE c.slug WHEN 'lucknow' THEN 12000 ELSE 11500 END) + (CASE WHEN v.fuel::text = 'diesel' THEN 2500 ELSE 0 END),
  -- 1-year comprehensive + 3-year third party, about 3.4% of ex-showroom rounded to the nearest 100
  (pg_catalog.round(v.ex_showroom * 0.034, -2))::int,
  CASE WHEN v.ex_showroom >= 1200000 THEN 9500 ELSE 8500 END,
  (CASE WHEN v.ex_showroom < 1000000 THEN 12000 WHEN v.ex_showroom < 1400000 THEN 15000 ELSE 18000 END)
    - (CASE c.slug WHEN 'kanpur' THEN 3000 ELSE 0 END),
  1.00,
  DATE '2026-01-01',
  DATE '2027-03-31',
  'Official ' || c.name || ' RTO breakup (' || v.name || ')'
FROM public.variants v
CROSS JOIN public.cities c
WHERE v.is_active = true
  AND c.slug IN ('lucknow', 'kanpur')
ON CONFLICT DO NOTHING;

-- 2. Model-level fallback rules (fuel NULL, variant NULL), sized from each model's cheapest variant
INSERT INTO public.price_rules (
  city_id, model_id, variant_id, fuel, road_tax_pct, registration, insurance, handling, accessories,
  tcs_pct, valid_from, valid_until, notes
)
SELECT
  c.id,
  m.id,
  NULL,
  NULL,
  10.00,
  CASE c.slug WHEN 'lucknow' THEN 12000 ELSE 11500 END,
  (pg_catalog.round(mv.min_price * 0.034, -2))::int,
  9000,
  CASE c.slug WHEN 'lucknow' THEN 15000 ELSE 12000 END,
  1.00,
  DATE '2026-01-01',
  DATE '2027-03-31',
  'Fallback ' || c.name || ' RTO breakup (' || m.name || ', any variant without its own rule)'
FROM public.models m
JOIN (
  SELECT model_id, MIN(ex_showroom) AS min_price
  FROM public.variants
  WHERE is_active = true
  GROUP BY model_id
) mv ON mv.model_id = m.id
CROSS JOIN public.cities c
WHERE c.slug IN ('lucknow', 'kanpur')
ON CONFLICT DO NOTHING;

-- =========================================================================
-- 7. OFFERS & SHOWCASE BANNERS
-- =========================================================================
INSERT INTO public.offers (
  id, title, title_hi, body, body_hi, model_id, badge, valid_from, valid_until, is_active
) VALUES
  (
    '0000000a-0000-0000-0000-000000000001',
    'Corporate & Loyalty Benefit ₹45,000',
    'कॉर्पोरेट और लॉयल्टी लाभ ₹45,000',
    'Special corporate package plus exchange bonus available on Model H ZX deliveries this month in Lucknow.',
    'इस महीने लखनऊ में मॉडल एच जेडएक्स डिलीवरी पर विशेष कॉर्पोरेट पैकेज और एक्सचेंज बोनस उपलब्ध है।',
    'd0000001-0000-0000-0000-000000000001',
    'Festive Advantage',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '60 days',
    true
  ),
  (
    '0000000a-0000-0000-0000-000000000002',
    'Zero Down Payment Scheme',
    'शून्य डाउन पेमेंट योजना',
    'Drive home Model S with 100% on-road funding from partner banks with competitive interest rates.',
    'प्रतिस्पर्धी ब्याज दरों पर पार्टनर बैंकों से 100% ऑन-रोड फंडिंग के साथ मॉडल एस घर ले जाएं।',
    'd0000001-0000-0000-0000-000000000003',
    'Easy EMI',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '90 days',
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.banners (id, title, title_hi, image_url, href, sort, is_active) VALUES
  (
    '0000000b-0000-0000-0000-000000000001',
    'Model H: The Executive Standard',
    'मॉडल एच: कार्यकारी मानक',
    '/images/cars/y.svg',
    '/cars/model-h',
    1,
    true
  ),
  (
    '0000000b-0000-0000-0000-000000000002',
    'Certified Used Cars with 1-Year Dealership Warranty',
    '1 वर्ष की डीलरशिप वारंटी के साथ प्रमाणित पुरानी कारें',
    '/images/cars/c.svg',
    '/used-cars',
    2,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 8. STAFF PROFILE PLACEHOLDERS (Consultants & Managers)
-- Guarded with WHERE EXISTS against auth.users so seed.sql runs safely
-- on clean databases without foreign key violation. Real auth accounts
-- are provisioned via scripts/seed-dev-users.ts.
-- =========================================================================
DO $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, phone, role, locale, is_active, onboarding_completed_at
  )
  SELECT v.id, v.email, v.full_name, v.phone, v.role::public.role_type, v.locale, true, NOW()
  FROM (
    VALUES
      ('00000000-0000-0000-0000-000000000011'::uuid, 'rohit.verma@vrooma.in', 'Rohit Verma', '+919876500011', 'consultant', 'en'),
      ('00000000-0000-0000-0000-000000000012'::uuid, 'ananya.shukla@vrooma.in', 'Ananya Shukla', '+919876500012', 'consultant', 'en'),
      ('00000000-0000-0000-0000-000000000013'::uuid, 'faizan.khan@vrooma.in', 'Faizan Khan', '+919876500013', 'consultant', 'en'),
      ('00000000-0000-0000-0000-000000000014'::uuid, 'deepak.tripathi@vrooma.in', 'Deepak Tripathi', '+919876500014', 'consultant', 'hi'),
      ('00000000-0000-0000-0000-000000000015'::uuid, 'pooja.singh@vrooma.in', 'Pooja Singh', '+919876500015', 'consultant', 'en'),
      ('00000000-0000-0000-0000-000000000016'::uuid, 'sameer.gupta@vrooma.in', 'Sameer Gupta', '+919876500016', 'consultant', 'hi'),
      ('00000000-0000-0000-0000-000000000020'::uuid, 'usedcars.manager@vrooma.in', 'Vivek Saxena', '+919876500020', 'manager', 'en')
  ) AS v(id, email, full_name, phone, role, locale)
  WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v.id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  -- Assign Staff to Showrooms (only for existing profiles)
  INSERT INTO public.staff_showrooms (profile_id, showroom_id, is_primary)
  SELECT s.profile_id, s.showroom_id, s.is_primary
  FROM (
    VALUES
      ('00000000-0000-0000-0000-000000000011'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid, true),
      ('00000000-0000-0000-0000-000000000012'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid, true),
      ('00000000-0000-0000-0000-000000000013'::uuid, 'a0000001-0000-0000-0000-000000000002'::uuid, true),
      ('00000000-0000-0000-0000-000000000014'::uuid, 'a0000001-0000-0000-0000-000000000002'::uuid, true),
      ('00000000-0000-0000-0000-000000000015'::uuid, 'a0000001-0000-0000-0000-000000000003'::uuid, true),
      ('00000000-0000-0000-0000-000000000016'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid, false),
      ('00000000-0000-0000-0000-000000000020'::uuid, 'a0000001-0000-0000-0000-000000000001'::uuid, true)
  ) AS s(profile_id, showroom_id, is_primary)
  WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.profile_id)
  ON CONFLICT (profile_id, showroom_id) DO NOTHING;
END $$;

-- =========================================================================
-- 9. LEAD ASSIGNMENT ROUTING RULES & CONSULTANT POOLS
-- =========================================================================
INSERT INTO public.assignment_rules (id, showroom_id, model_id, priority, is_active) VALUES
  ('0000000c-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 1, true),
  ('0000000c-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000002', 1, true),
  ('0000000c-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 1, true),
  ('0000000c-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003', NULL, 1, true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  INSERT INTO public.assignment_rule_consultants (rule_id, consultant_id)
  SELECT c.rule_id, c.consultant_id
  FROM (
    VALUES
      ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000011'::uuid),
      ('0000000c-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000012'::uuid),
      ('0000000c-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000011'::uuid),
      ('0000000c-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000013'::uuid),
      ('0000000c-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000015'::uuid)
  ) AS c(rule_id, consultant_id)
  WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.consultant_id)
  ON CONFLICT (rule_id, consultant_id) DO NOTHING;
END $$;

COMMIT;
