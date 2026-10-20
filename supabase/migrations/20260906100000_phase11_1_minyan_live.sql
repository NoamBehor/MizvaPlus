-- Phase 11.1: Minyan Live database foundation, RLS, and server-authoritative RPCs
--
-- Canonical synagogue coordinates live in synagogue_anchors (NOT client-supplied).
-- Overpass remains the discovery/display source; anchors exist only for geofence authority.
--
-- V1 anchor population: service-role `upsert_synagogue_anchor` only.
-- Trusted source: admin pipeline seeding from Overpass center coordinates.
-- Authenticated clients CANNOT insert or update synagogue_anchors.

-- ─── Shared helpers ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.minyan_live_config()
RETURNS TABLE (
  required_count integer,
  max_report_radius_meters integer,
  max_gps_accuracy_meters integer,
  accuracy_cap_meters integer,
  location_max_age_ms bigint,
  report_ttl_minutes integer,
  rate_new_reports_per_hour integer,
  rate_updates_per_report integer,
  rate_supersede_cooldown_minutes integer,
  rate_fulfill_interval_seconds integer
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    10::integer,
    120::integer,
    50::integer,
    30::integer,
    30000::bigint,
    20::integer,
    5::integer,
    10::integer,
    2::integer,
    5::integer;
$$;

CREATE OR REPLACE FUNCTION public.minyan_raise(p_code text, p_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '%', COALESCE(p_message, p_code)
    USING ERRCODE = 'P0001', DETAIL = p_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_assert_authenticated()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    PERFORM public.minyan_raise('NOT_AUTHENTICATED');
  END IF;
  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_assert_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF COALESCE(auth.role(), current_setting('request.jwt.claim.role', true)) IS DISTINCT FROM 'service_role' THEN
    PERFORM public.minyan_raise('FORBIDDEN', 'Service role required');
  END IF;
END;
$$;

/**
 * Haversine distance in meters — mirrors src/utils/distance.ts calculateDistanceMeters.
 * Earth radius = 6_371_000 m.
 */
CREATE OR REPLACE FUNCTION public.haversine_distance_meters(
  p_lat1 double precision,
  p_lon1 double precision,
  p_lat2 double precision,
  p_lon2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  earth_radius constant double precision := 6371000;
  lat1_rad double precision;
  lat2_rad double precision;
  delta_lat double precision;
  delta_lon double precision;
  a double precision;
  c double precision;
BEGIN
  lat1_rad := radians(p_lat1);
  lat2_rad := radians(p_lat2);
  delta_lat := radians(p_lat2 - p_lat1);
  delta_lon := radians(p_lon2 - p_lon1);

  a := sin(delta_lat / 2) ^ 2
    + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ^ 2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));

  RETURN earth_radius * c;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_compute_missing_count(p_current_attendance integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(0, (SELECT required_count FROM public.minyan_live_config() LIMIT 1) - p_current_attendance);
$$;

CREATE OR REPLACE FUNCTION public.minyan_parse_osm_key(p_synagogue_osm_key text)
RETURNS TABLE (osm_type text, osm_id bigint)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
BEGIN
  IF p_synagogue_osm_key IS NULL OR p_synagogue_osm_key !~ '^(node|way|relation)/[0-9]+$' THEN
    PERFORM public.minyan_raise('INVALID_SYNAGOGUE_KEY');
  END IF;

  parts := string_to_array(p_synagogue_osm_key, '/');
  osm_type := parts[1];
  osm_id := parts[2]::bigint;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_validate_user_location(
  p_user_latitude double precision,
  p_user_longitude double precision,
  p_user_accuracy_meters real,
  p_user_location_captured_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cfg record;
BEGIN
  SELECT * INTO cfg FROM public.minyan_live_config() LIMIT 1;

  IF p_user_latitude IS NULL
    OR p_user_longitude IS NULL
    OR NOT (p_user_latitude BETWEEN -90 AND 90)
    OR NOT (p_user_longitude BETWEEN -180 AND 180) THEN
    PERFORM public.minyan_raise('INVALID_COORDINATES');
  END IF;

  IF p_user_accuracy_meters IS NULL OR p_user_accuracy_meters > cfg.max_gps_accuracy_meters THEN
    PERFORM public.minyan_raise('LOCATION_ACCURACY_INSUFFICIENT');
  END IF;

  IF p_user_location_captured_at IS NOT NULL
    AND p_user_location_captured_at > (now() + interval '5 seconds') THEN
    PERFORM public.minyan_raise('LOCATION_STALE');
  END IF;

  IF p_user_location_captured_at IS NOT NULL
    AND (now() - p_user_location_captured_at) > (cfg.location_max_age_ms * interval '1 millisecond') THEN
    PERFORM public.minyan_raise('LOCATION_STALE');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_validate_geofence(
  p_user_latitude double precision,
  p_user_longitude double precision,
  p_user_accuracy_meters real,
  p_anchor_latitude double precision,
  p_anchor_longitude double precision
)
RETURNS double precision
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cfg record;
  distance_meters double precision;
  effective_radius double precision;
BEGIN
  SELECT * INTO cfg FROM public.minyan_live_config() LIMIT 1;

  distance_meters := public.haversine_distance_meters(
    p_user_latitude,
    p_user_longitude,
    p_anchor_latitude,
    p_anchor_longitude
  );

  effective_radius := cfg.max_report_radius_meters
    + LEAST(p_user_accuracy_meters, cfg.accuracy_cap_meters);

  IF distance_meters > effective_radius THEN
    PERFORM public.minyan_raise('GEOFENCE_VIOLATION');
  END IF;

  RETURN distance_meters;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_validate_attendance(p_current_attendance integer)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_current_attendance IS NULL
    OR p_current_attendance < 0
    OR p_current_attendance > (SELECT required_count FROM public.minyan_live_config() LIMIT 1) THEN
    PERFORM public.minyan_raise('INVALID_ATTENDANCE');
  END IF;
END;
$$;

-- ─── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.synagogue_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_osm_key TEXT NOT NULL,
  osm_type TEXT NOT NULL CHECK (osm_type IN ('node', 'way', 'relation')),
  osm_id BIGINT NOT NULL,
  canonical_latitude DOUBLE PRECISION NOT NULL
    CHECK (canonical_latitude >= -90 AND canonical_latitude <= 90),
  canonical_longitude DOUBLE PRECISION NOT NULL
    CHECK (canonical_longitude >= -180 AND canonical_longitude <= 180),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT synagogue_anchors_osm_key_unique UNIQUE (synagogue_osm_key),
  CONSTRAINT synagogue_anchors_osm_key_matches
    CHECK (synagogue_osm_key = osm_type || '/' || osm_id::text)
);

DROP TRIGGER IF EXISTS synagogue_anchors_set_updated_at ON public.synagogue_anchors;
CREATE TRIGGER synagogue_anchors_set_updated_at
  BEFORE UPDATE ON public.synagogue_anchors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.minyan_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synagogue_osm_key TEXT NOT NULL
    REFERENCES public.synagogue_anchors(synagogue_osm_key),
  osm_type TEXT NOT NULL CHECK (osm_type IN ('node', 'way', 'relation')),
  osm_id BIGINT NOT NULL,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_attendance SMALLINT NOT NULL
    CHECK (current_attendance >= 0 AND current_attendance <= 10),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'FULFILLED', 'EXPIRED')),
  expired_reason TEXT
    CHECK (expired_reason IS NULL OR expired_reason IN ('ttl', 'superseded', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by_user_id UUID REFERENCES auth.users(id),
  expired_at TIMESTAMPTZ,
  update_count INTEGER NOT NULL DEFAULT 0 CHECK (update_count >= 0),
  report_latitude DOUBLE PRECISION NOT NULL
    CHECK (report_latitude >= -90 AND report_latitude <= 90),
  report_longitude DOUBLE PRECISION NOT NULL
    CHECK (report_longitude >= -180 AND report_longitude <= 180),
  report_accuracy_meters REAL CHECK (report_accuracy_meters IS NULL OR report_accuracy_meters >= 0),
  report_distance_meters REAL NOT NULL CHECK (report_distance_meters >= 0),
  CONSTRAINT minyan_reports_osm_key_matches
    CHECK (synagogue_osm_key = osm_type || '/' || osm_id::text)
);

-- Phase 11.1.4: missing_count is server-derived at read time (not stored state).
ALTER TABLE public.minyan_reports
  DROP CONSTRAINT IF EXISTS minyan_reports_missing_count_matches;
ALTER TABLE public.minyan_reports
  DROP COLUMN IF EXISTS missing_count;

DROP TRIGGER IF EXISTS minyan_reports_set_updated_at ON public.minyan_reports;
CREATE TRIGGER minyan_reports_set_updated_at
  BEFORE UPDATE ON public.minyan_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.minyan_coming_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minyan_report_id UUID NOT NULL REFERENCES public.minyan_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'COMING'
    CHECK (status IN ('COMING', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT minyan_coming_one_per_user_per_report UNIQUE (minyan_report_id, user_id)
);

-- ─── Public RPC return type ─────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'public_minyan_report' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.public_minyan_report AS (
      id uuid,
      synagogue_osm_key text,
      current_attendance smallint,
      missing_count smallint,
      status text,
      created_at timestamptz,
      updated_at timestamptz,
      expires_at timestamptz,
      coming_count bigint
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_to_public_row(
  p_report public.minyan_reports,
  p_coming_count bigint DEFAULT 0
)
RETURNS public.public_minyan_report
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROW(
    p_report.id,
    p_report.synagogue_osm_key,
    p_report.current_attendance,
    public.minyan_compute_missing_count(p_report.current_attendance)::smallint,
    p_report.status,
    p_report.created_at,
    p_report.updated_at,
    p_report.expires_at,
    COALESCE(p_coming_count, 0)
  )::public.public_minyan_report;
$$;

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS minyan_reports_one_active_per_synagogue_idx
  ON public.minyan_reports (synagogue_osm_key)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS minyan_reports_active_expires_idx
  ON public.minyan_reports (expires_at)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS minyan_reports_synagogue_osm_key_created_idx
  ON public.minyan_reports (synagogue_osm_key, created_at DESC);

CREATE INDEX IF NOT EXISTS minyan_reports_reporter_created_idx
  ON public.minyan_reports (reporter_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS minyan_reports_reporter_superseded_idx
  ON public.minyan_reports (reporter_user_id, synagogue_osm_key, expired_at DESC)
  WHERE expired_reason = 'superseded';

CREATE INDEX IF NOT EXISTS minyan_reports_fulfilled_by_updated_idx
  ON public.minyan_reports (fulfilled_by_user_id, updated_at DESC)
  WHERE status = 'FULFILLED';

CREATE INDEX IF NOT EXISTS minyan_reports_status_expires_idx
  ON public.minyan_reports (status, expires_at);

CREATE INDEX IF NOT EXISTS synagogue_anchors_osm_key_idx
  ON public.synagogue_anchors (synagogue_osm_key);

CREATE INDEX IF NOT EXISTS minyan_coming_report_status_expires_idx
  ON public.minyan_coming_intentions (minyan_report_id, status, expires_at);

CREATE INDEX IF NOT EXISTS minyan_coming_user_created_idx
  ON public.minyan_coming_intentions (user_id, created_at DESC);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.synagogue_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minyan_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minyan_coming_intentions ENABLE ROW LEVEL SECURITY;

-- synagogue_anchors: no policies for authenticated users (service role only)
-- minyan_reports: no policies for authenticated users (public data via RPC only).

DROP POLICY IF EXISTS minyan_reports_select_own ON public.minyan_reports;

DROP POLICY IF EXISTS minyan_coming_select_own ON public.minyan_coming_intentions;
CREATE POLICY minyan_coming_select_own
  ON public.minyan_coming_intentions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS minyan_coming_insert_own ON public.minyan_coming_intentions;
CREATE POLICY minyan_coming_insert_own
  ON public.minyan_coming_intentions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS minyan_coming_update_own ON public.minyan_coming_intentions;
CREATE POLICY minyan_coming_update_own
  ON public.minyan_coming_intentions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Anchor registration (service role only) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_synagogue_anchor(
  p_synagogue_osm_key text,
  p_osm_type text,
  p_osm_id bigint,
  p_canonical_latitude double precision,
  p_canonical_longitude double precision
)
RETURNS public.synagogue_anchors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.synagogue_anchors;
BEGIN
  PERFORM public.minyan_assert_service_role();

  IF p_synagogue_osm_key IS DISTINCT FROM (p_osm_type || '/' || p_osm_id::text) THEN
    PERFORM public.minyan_raise('INVALID_SYNAGOGUE_KEY', 'OSM key does not match type/id');
  END IF;

  IF p_osm_type NOT IN ('node', 'way', 'relation') THEN
    PERFORM public.minyan_raise('INVALID_SYNAGOGUE_KEY');
  END IF;

  IF NOT (p_canonical_latitude BETWEEN -90 AND 90)
    OR NOT (p_canonical_longitude BETWEEN -180 AND 180) THEN
    PERFORM public.minyan_raise('INVALID_COORDINATES');
  END IF;

  INSERT INTO public.synagogue_anchors (
    synagogue_osm_key,
    osm_type,
    osm_id,
    canonical_latitude,
    canonical_longitude
  )
  VALUES (
    p_synagogue_osm_key,
    p_osm_type,
    p_osm_id,
    p_canonical_latitude,
    p_canonical_longitude
  )
  ON CONFLICT (synagogue_osm_key) DO UPDATE
  SET
    osm_type = EXCLUDED.osm_type,
    osm_id = EXCLUDED.osm_id,
    canonical_latitude = EXCLUDED.canonical_latitude,
    canonical_longitude = EXCLUDED.canonical_longitude,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ─── Rate limit helpers ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.minyan_check_create_rate_limits(
  p_user_id uuid,
  p_synagogue_osm_key text
)
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cfg record;
  recent_count integer;
BEGIN
  SELECT * INTO cfg FROM public.minyan_live_config() LIMIT 1;

  SELECT count(*)::integer INTO recent_count
  FROM public.minyan_reports
  WHERE reporter_user_id = p_user_id
    AND created_at > (now() - interval '1 hour');

  IF recent_count >= cfg.rate_new_reports_per_hour THEN
    PERFORM public.minyan_raise('RATE_LIMITED', 'Too many new reports in the last hour');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.minyan_reports
    WHERE reporter_user_id = p_user_id
      AND synagogue_osm_key = p_synagogue_osm_key
      AND expired_reason = 'superseded'
      AND expired_at > (now() - (cfg.rate_supersede_cooldown_minutes * interval '1 minute'))
  ) THEN
    PERFORM public.minyan_raise('RATE_LIMITED', 'Cooldown after superseded report');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.minyan_check_fulfill_rate_limit(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cfg record;
BEGIN
  SELECT * INTO cfg FROM public.minyan_live_config() LIMIT 1;

  IF EXISTS (
    SELECT 1
    FROM public.minyan_reports
    WHERE fulfilled_by_user_id = p_user_id
      AND status = 'FULFILLED'
      AND updated_at > (now() - (cfg.rate_fulfill_interval_seconds * interval '1 second'))
  ) THEN
    PERFORM public.minyan_raise('RATE_LIMITED', 'Fulfill attempts too frequent');
  END IF;
END;
$$;

-- ─── Mutation RPCs ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_minyan_report(
  p_synagogue_osm_key text,
  p_user_latitude double precision,
  p_user_longitude double precision,
  p_user_accuracy_meters real,
  p_current_attendance integer,
  p_user_location_captured_at timestamptz DEFAULT NULL
)
RETURNS public.public_minyan_report
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  cfg record;
  v_parsed record;
  v_anchor public.synagogue_anchors;
  v_distance double precision;
  v_status text;
  v_expires_at timestamptz;
  v_row public.minyan_reports;
  v_coming_count bigint := 0;
BEGIN
  v_user_id := public.minyan_assert_authenticated();
  SELECT * INTO cfg FROM public.minyan_live_config() LIMIT 1;

  PERFORM public.minyan_validate_attendance(p_current_attendance);
  PERFORM public.minyan_validate_user_location(
    p_user_latitude,
    p_user_longitude,
    p_user_accuracy_meters,
    p_user_location_captured_at
  );
  PERFORM public.minyan_check_create_rate_limits(v_user_id, p_synagogue_osm_key);

  PERFORM pg_advisory_xact_lock(hashtext(p_synagogue_osm_key));

  SELECT * INTO v_parsed FROM public.minyan_parse_osm_key(p_synagogue_osm_key);

  SELECT * INTO v_anchor
  FROM public.synagogue_anchors
  WHERE synagogue_osm_key = p_synagogue_osm_key;

  IF NOT FOUND THEN
    PERFORM public.minyan_raise('ANCHOR_NOT_FOUND');
  END IF;

  v_distance := public.minyan_validate_geofence(
    p_user_latitude,
    p_user_longitude,
    p_user_accuracy_meters,
    v_anchor.canonical_latitude,
    v_anchor.canonical_longitude
  );

  IF p_current_attendance >= cfg.required_count THEN
    v_status := 'FULFILLED';
    v_expires_at := now();
  ELSE
    v_status := 'ACTIVE';
    v_expires_at := now() + (cfg.report_ttl_minutes * interval '1 minute');
  END IF;

  -- Transactional supersede of any existing ACTIVE report for this synagogue.
  UPDATE public.minyan_reports
  SET
    status = 'EXPIRED',
    expired_reason = 'superseded',
    expired_at = now()
  WHERE synagogue_osm_key = p_synagogue_osm_key
    AND status = 'ACTIVE';

  INSERT INTO public.minyan_reports (
    synagogue_osm_key,
    osm_type,
    osm_id,
    reporter_user_id,
    current_attendance,
    status,
    expires_at,
    fulfilled_at,
    fulfilled_by_user_id,
    report_latitude,
    report_longitude,
    report_accuracy_meters,
    report_distance_meters
  )
  VALUES (
    p_synagogue_osm_key,
    v_parsed.osm_type,
    v_parsed.osm_id,
    v_user_id,
    p_current_attendance,
    v_status,
    v_expires_at,
    CASE WHEN v_status = 'FULFILLED' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'FULFILLED' THEN v_user_id ELSE NULL END,
    p_user_latitude,
    p_user_longitude,
    p_user_accuracy_meters,
    v_distance
  )
  RETURNING * INTO v_row;

  RETURN public.minyan_to_public_row(v_row, v_coming_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_minyan_report(
  p_report_id uuid,
  p_user_latitude double precision,
  p_user_longitude double precision,
  p_user_accuracy_meters real,
  p_current_attendance integer,
  p_user_location_captured_at timestamptz DEFAULT NULL
)
RETURNS public.public_minyan_report
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  cfg record;
  v_existing public.minyan_reports;
  v_anchor public.synagogue_anchors;
  v_distance double precision;
  v_status text;
  v_expires_at timestamptz;
  v_row public.minyan_reports;
  v_coming_count bigint;
BEGIN
  v_user_id := public.minyan_assert_authenticated();
  SELECT * INTO cfg FROM public.minyan_live_config() LIMIT 1;

  PERFORM public.minyan_validate_attendance(p_current_attendance);
  PERFORM public.minyan_validate_user_location(
    p_user_latitude,
    p_user_longitude,
    p_user_accuracy_meters,
    p_user_location_captured_at
  );

  SELECT * INTO v_existing
  FROM public.minyan_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM public.minyan_raise('REPORT_NOT_FOUND');
  END IF;

  IF v_existing.reporter_user_id IS DISTINCT FROM v_user_id THEN
    PERFORM public.minyan_raise('NOT_REPORT_OWNER');
  END IF;

  IF v_existing.status <> 'ACTIVE' OR v_existing.expires_at <= now() THEN
    PERFORM public.minyan_raise('REPORT_EXPIRED');
  END IF;

  IF v_existing.update_count >= cfg.rate_updates_per_report THEN
    PERFORM public.minyan_raise('RATE_LIMITED', 'Maximum updates reached for this report');
  END IF;

  SELECT * INTO v_anchor
  FROM public.synagogue_anchors
  WHERE synagogue_osm_key = v_existing.synagogue_osm_key;

  IF NOT FOUND THEN
    PERFORM public.minyan_raise('ANCHOR_NOT_FOUND');
  END IF;

  v_distance := public.minyan_validate_geofence(
    p_user_latitude,
    p_user_longitude,
    p_user_accuracy_meters,
    v_anchor.canonical_latitude,
    v_anchor.canonical_longitude
  );

  IF p_current_attendance >= cfg.required_count THEN
    v_status := 'FULFILLED';
    v_expires_at := v_existing.expires_at;
  ELSE
    v_status := 'ACTIVE';
    v_expires_at := now() + (cfg.report_ttl_minutes * interval '1 minute');
  END IF;

  UPDATE public.minyan_reports
  SET
    current_attendance = p_current_attendance,
    status = v_status,
    expires_at = v_expires_at,
    fulfilled_at = CASE WHEN v_status = 'FULFILLED' THEN now() ELSE NULL END,
    fulfilled_by_user_id = CASE WHEN v_status = 'FULFILLED' THEN v_user_id ELSE NULL END,
    update_count = update_count + 1,
    report_latitude = p_user_latitude,
    report_longitude = p_user_longitude,
    report_accuracy_meters = p_user_accuracy_meters,
    report_distance_meters = v_distance
  WHERE id = p_report_id
    AND status = 'ACTIVE'
    AND expires_at > now()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    PERFORM public.minyan_raise('REPORT_EXPIRED');
  END IF;

  SELECT count(*) INTO v_coming_count
  FROM public.minyan_coming_intentions
  WHERE minyan_report_id = v_row.id
    AND status = 'COMING'
    AND expires_at > now();

  RETURN public.minyan_to_public_row(v_row, v_coming_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_minyan_report(
  p_report_id uuid,
  p_user_latitude double precision,
  p_user_longitude double precision,
  p_user_accuracy_meters real,
  p_user_location_captured_at timestamptz DEFAULT NULL
)
RETURNS public.public_minyan_report
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing public.minyan_reports;
  v_anchor public.synagogue_anchors;
  v_distance double precision;
  v_row public.minyan_reports;
  v_coming_count bigint := 0;
BEGIN
  v_user_id := public.minyan_assert_authenticated();

  PERFORM public.minyan_validate_user_location(
    p_user_latitude,
    p_user_longitude,
    p_user_accuracy_meters,
    p_user_location_captured_at
  );
  PERFORM public.minyan_check_fulfill_rate_limit(v_user_id);

  SELECT * INTO v_existing
  FROM public.minyan_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM public.minyan_raise('REPORT_NOT_FOUND');
  END IF;

  -- Idempotent: already fulfilled returns current public shape.
  IF v_existing.status = 'FULFILLED' THEN
    RETURN public.minyan_to_public_row(v_existing, v_coming_count);
  END IF;

  IF v_existing.status <> 'ACTIVE' OR v_existing.expires_at <= now() THEN
    PERFORM public.minyan_raise('REPORT_EXPIRED');
  END IF;

  SELECT * INTO v_anchor
  FROM public.synagogue_anchors
  WHERE synagogue_osm_key = v_existing.synagogue_osm_key;

  IF NOT FOUND THEN
    PERFORM public.minyan_raise('ANCHOR_NOT_FOUND');
  END IF;

  v_distance := public.minyan_validate_geofence(
    p_user_latitude,
    p_user_longitude,
    p_user_accuracy_meters,
    v_anchor.canonical_latitude,
    v_anchor.canonical_longitude
  );

  UPDATE public.minyan_reports
  SET
    status = 'FULFILLED',
    fulfilled_at = now(),
    fulfilled_by_user_id = v_user_id,
    report_latitude = p_user_latitude,
    report_longitude = p_user_longitude,
    report_accuracy_meters = p_user_accuracy_meters,
    report_distance_meters = v_distance
  WHERE id = p_report_id
    AND status = 'ACTIVE'
    AND expires_at > now()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    PERFORM public.minyan_raise('REPORT_EXPIRED');
  END IF;

  RETURN public.minyan_to_public_row(v_row, v_coming_count);
END;
$$;

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
  SELECT ROW(
    r.id,
    r.synagogue_osm_key,
    r.current_attendance,
    public.minyan_compute_missing_count(r.current_attendance)::smallint,
    r.status,
    r.created_at,
    r.updated_at,
    r.expires_at,
    COALESCE(c.coming_count, 0)
  )::public.public_minyan_report
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

CREATE OR REPLACE FUNCTION public.expire_stale_minyan_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.minyan_assert_service_role();

  UPDATE public.minyan_reports
  SET
    status = 'EXPIRED',
    expired_reason = 'ttl',
    expired_at = now()
  WHERE status = 'ACTIVE'
    AND expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────
-- Normal clients use RPC projections only; direct minyan_reports access is denied.

REVOKE ALL ON TABLE public.minyan_reports FROM PUBLIC;
REVOKE ALL ON TABLE public.minyan_reports FROM anon;
REVOKE ALL ON TABLE public.minyan_reports FROM authenticated;

REVOKE ALL ON TABLE public.synagogue_anchors FROM PUBLIC;
REVOKE ALL ON TABLE public.synagogue_anchors FROM anon;
REVOKE ALL ON TABLE public.synagogue_anchors FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON public.minyan_coming_intentions TO authenticated;

-- Authenticated mutation/list RPCs
REVOKE ALL ON FUNCTION public.create_minyan_report(
  text, double precision, double precision, real, integer, timestamptz
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_minyan_report(
  uuid, double precision, double precision, real, integer, timestamptz
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_minyan_report(
  uuid, double precision, double precision, real, timestamptz
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_active_minyan_reports(text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_minyan_report(
  text, double precision, double precision, real, integer, timestamptz
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_minyan_report(
  uuid, double precision, double precision, real, integer, timestamptz
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_minyan_report(
  uuid, double precision, double precision, real, timestamptz
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_active_minyan_reports(text[]) TO authenticated;

-- Service-role admin RPCs
REVOKE ALL ON FUNCTION public.upsert_synagogue_anchor(
  text, text, bigint, double precision, double precision
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_stale_minyan_reports() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.upsert_synagogue_anchor(
  text, text, bigint, double precision, double precision
) FROM authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_minyan_reports() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_synagogue_anchor(
  text, text, bigint, double precision, double precision
) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_minyan_reports() TO service_role;
