-- Sample certified used cars shown on /used-cars (client sample data) that were missing from the database.
-- Saving a car or opening its page resolves the stock id in public.used_cars, so every listed car needs a row.
-- Existing rows (UC-1182, UC-1190, UC-1204) are left untouched.
-- Rows whose model/showroom does not exist yet (fresh reset: seed.sql creates them later) are skipped.
INSERT INTO public.used_cars (
  id, stock_id, model_id, model_name, variant_name, fuel, year, km, owners,
  price, status, reg_no_private, showroom_id, certified, inspection,
  inspection_score, images, listed_at
)
SELECT v.id::uuid, v.stock_id, v.model_id::uuid, v.model_name, v.variant_name, v.fuel::fuel_type, v.year, v.km, v.owners,
  v.price, v.status::car_status_type, v.reg_no_private, v.showroom_id::uuid, v.certified, v.inspection, v.inspection_score, v.images, v.listed_at::timestamptz
FROM (VALUES
  ('f0000001-0000-0000-0000-000000000011', 'UC-1195', 'd0000001-0000-0000-0000-000000000001', 'Model H', 'ZX Automatic',
   'petrol', 2023, 22400, 2, 1045000, 'available', 'UP32EA2240', 'a0000001-0000-0000-0000-000000000001', true,
   '{"engine": "Like New", "flood_damage": "None", "accidental": "None"}'::jsonb, 98, '["/images/cars/y.svg"]'::jsonb, '2026-06-01T10:00:00Z'),
  ('f0000001-0000-0000-0000-000000000012', 'UC-1201', 'd0000001-0000-0000-0000-000000000005', 'Model T', '4x4 MT',
   'diesel', 2022, 36000, 2, 1320000, 'available', 'UP32FF3600', 'a0000001-0000-0000-0000-000000000002', true,
   '{"engine": "Excellent", "flood_damage": "None", "accidental": "None"}'::jsonb, 92, '["/images/cars/r.svg"]'::jsonb, '2026-10-28T10:00:00Z'),
  ('f0000001-0000-0000-0000-000000000013', 'UC-1205', 'd0000001-0000-0000-0000-000000000002', 'Model C', 'LX Manual',
   'petrol', 2021, 49500, 1, 760000, 'available', 'UP32GH4950', 'a0000001-0000-0000-0000-000000000003', true,
   '{"engine": "Good", "flood_damage": "None", "accidental": "None"}'::jsonb, 89, '["/images/cars/c.svg"]'::jsonb, '2026-05-14T10:00:00Z'),
  ('f0000001-0000-0000-0000-000000000014', 'UC-1210', 'd0000001-0000-0000-0000-000000000003', 'Model S', 'ZX AMT CNG',
   'cng', 2023, 18200, 1, 685000, 'available', 'UP32JK1820', 'a0000001-0000-0000-0000-000000000001', true,
   '{"engine": "Like New", "flood_damage": "None", "accidental": "None"}'::jsonb, 97, '["/images/cars/s.svg"]'::jsonb, '2026-10-30T10:00:00Z'),
  ('f0000001-0000-0000-0000-000000000015', 'UC-1214', 'd0000001-0000-0000-0000-000000000001', 'Model H', 'VX Manual',
   'petrol', 2020, 67500, 2, 790000, 'available', 'UP32LM6750', 'a0000001-0000-0000-0000-000000000002', true,
   '{"engine": "Good", "flood_damage": "None", "accidental": "None"}'::jsonb, 88, '["/images/cars/y.svg"]'::jsonb, '2026-05-04T10:00:00Z'),
  ('f0000001-0000-0000-0000-000000000016', 'UC-1220', 'd0000001-0000-0000-0000-000000000004', 'Model X', 'Long Range EV',
   'ev', 2023, 15400, 1, 1590000, 'available', 'UP32EV1540', 'a0000001-0000-0000-0000-000000000001', true,
   '{"engine": "Like New", "flood_damage": "None", "accidental": "None"}'::jsonb, 99, '["/images/cars/x.svg"]'::jsonb, '2026-05-22T10:00:00Z')
) AS v(id, stock_id, model_id, model_name, variant_name, fuel, year, km, owners,
  price, status, reg_no_private, showroom_id, certified, inspection, inspection_score, images, listed_at)
WHERE EXISTS (SELECT 1 FROM public.models m WHERE m.id = v.model_id::uuid)
  AND EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = v.showroom_id::uuid)
ON CONFLICT DO NOTHING;
