-- 0032_check_rate_limit_rpc.sql
-- The shared rate limiter private.hit_rate_limit (0008) lives in a schema PostgREST does not expose, so the app
-- could not call it and every API route fell back to per-instance in-memory counters (useless on serverless).
-- Expose a thin service-role wrapper. Returns true while the caller is within the limit.

BEGIN;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_key IS NULL OR pg_catalog.length(p_key) = 0 OR pg_catalog.length(p_key) > 200 THEN
    RAISE EXCEPTION 'invalid rate limit key';
  END IF;
  IF p_limit < 1 OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit window';
  END IF;
  RETURN private.hit_rate_limit(p_key, p_limit, p_window_seconds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;

COMMIT;
