-- Phase 11.1.2 — Fix list_active_minyan_reports 42804 mismatch
--
-- Deployed functions using `RETURNS SETOF public_minyan_report` must project composite
-- fields as individual columns in RETURN QUERY. Wrapping with ROW(...)::public_minyan_report
-- yields a single composite column and PostgreSQL error 42804:
--   Returned type public_minyan_report does not match expected type uuid in column 1

CREATE OR REPLACE FUNCTION public.list_active_minyan_reports(
  p_synagogue_osm_keys text[] DEFAULT NULL
)
RETURNS SETOF public.public_minyan_report
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.minyan_assert_authenticated();

  RETURN QUERY
  SELECT
    r.id,
    r.synagogue_osm_key,
    r.current_attendance,
    public.minyan_compute_missing_count(r.current_attendance)::smallint,
    r.status,
    r.created_at,
    r.updated_at,
    r.expires_at,
    COALESCE(c.coming_count, 0)::bigint
  FROM public.minyan_reports r
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS coming_count
    FROM public.minyan_coming_intentions i
    WHERE i.minyan_report_id = r.id
      AND i.status = 'COMING'
      AND i.expires_at > now()
  ) c ON true
  WHERE r.status = 'ACTIVE'
    AND r.expires_at > now()
    AND (
      p_synagogue_osm_keys IS NULL
      OR r.synagogue_osm_key = ANY (p_synagogue_osm_keys)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.list_active_minyan_reports(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_minyan_reports(text[]) TO authenticated;
