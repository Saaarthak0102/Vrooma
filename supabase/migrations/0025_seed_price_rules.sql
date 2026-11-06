-- 0025_seed_price_rules.sql
-- Official on-road price rules (RTO / insurance / handling / accessories) for EVERY variant in Lucknow and
-- Kanpur, plus one model-level fallback rule per model and city.
--
-- Why: only 3 variant rules existed, and none for the variant each model page opens on (the cheapest), so the
-- on-road price showed "unavailable" everywhere. resolve_price_rule picks: variant rule -> model+fuel rule ->
-- model general rule, so the model-level rows also cover variants added later in the admin CMS.
--
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING (no target) skips any row that would overlap an existing rule
-- for the same city + scope (the exclusion constraint), so re-running or running after admin edits is safe.
-- Rows are derived from the variants / models / cities tables, so no ids are hard-coded.

BEGIN;

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

COMMIT;
