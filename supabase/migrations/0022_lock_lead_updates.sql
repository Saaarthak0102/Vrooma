-- Staff must not edit leads directly through PostgREST: that let a consultant rewrite first_contacted_at,
-- sla_due_at or status and fake their SLA numbers. Every legitimate write already goes through the
-- SECURITY DEFINER RPCs (set_lead_status, reassign_lead, create_lead) or the service role.
DROP POLICY IF EXISTS "Consultants update assigned leads" ON public.leads;
REVOKE UPDATE, INSERT, DELETE ON public.leads FROM authenticated, anon;
