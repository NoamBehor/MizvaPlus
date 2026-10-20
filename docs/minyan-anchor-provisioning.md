# Minyan Live — Synagogue Anchor Provisioning

Phase 11.1 keeps geofence authority on the server. The mobile app discovers synagogues via Overpass for map display, but **cannot** write to `synagogue_anchors`.

## Root cause of `ANCHOR_NOT_FOUND`

When a user selects an OSM synagogue that has no row in `synagogue_anchors`, `create_minyan_report` fails with `ANCHOR_NOT_FOUND`. This is a **provisioning gap**, not a client geofence bug.

## Authoritative schema (`synagogue_anchors`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `synagogue_osm_key` | TEXT | Unique, format `{type}/{id}` |
| `osm_type` | TEXT | `node`, `way`, or `relation` |
| `osm_id` | BIGINT | OSM element id |
| `canonical_latitude` | DOUBLE PRECISION | Server geofence center |
| `canonical_longitude` | DOUBLE PRECISION | Server geofence center |
| `updated_at` | TIMESTAMPTZ | Auto-maintained |

There are **no** `name`, `address`, `lat`, or `lon` columns. Display names come from Overpass on the client; geofence coordinates come from the anchor row.

## Security model (unchanged)

- RLS enabled on `synagogue_anchors` with **no** authenticated policies.
- Table grants revoked from `anon` and `authenticated`.
- `upsert_synagogue_anchor` is executable by **`service_role` only**.
- `create_minyan_report` is server-authoritative: it reads the anchor, validates geofence, and inserts the report.
- The mobile app must **never** call `supabase.from('synagogue_anchors').upsert(...)`.
- Service-role credentials must **never** ship in the mobile app.
- Client-supplied coordinates are **not** trusted for anchor creation.

## Trusted provisioning flow

```text
Overpass synagogue (discovery)
        ↓
trusted provisioning process (service role / admin)
        ↓
upsert_synagogue_anchor RPC
        ↓
synagogue_anchors table
        ↓
create_minyan_report (authenticated users)
```

Canonical coordinates must originate from trusted Overpass queries or admin-verified data—not from the mobile client.

## Development / E2E bootstrap

For physical device testing, provision a specific synagogue:

```bash
npm run bootstrap:minyan-anchor -- --osm-key node/123456
```

Default (nearest Jerusalem synagogue):

```bash
npm run bootstrap:minyan-anchor
```

Required environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_OVERPASS_API_URL` (optional)

The script resolves coordinates from Overpass, then calls `upsert_synagogue_anchor` with the service role.

## Client behavior when anchor is missing

The app maps `ANCHOR_NOT_FOUND` to:

> בית הכנסת עדיין לא זמין לדיווח מניין. נסו שוב מאוחר יותר.

No silent anchor creation. No raw PostgreSQL errors exposed to users.

## Production provisioning strategy

Recommended pipeline (not implemented in the mobile app):

1. **Discovery** — Query Overpass for Jewish places of worship / synagogue buildings (same filters as the app).
2. **Normalization** — Build `synagogue_osm_key`, `osm_type`, `osm_id`; extract center coordinates from Overpass (`out center`).
3. **Reconciliation** — Compare with existing `synagogue_anchors`; upsert when missing or when geometry changed materially.
4. **Schedule** — Run as a cron job, CI task, or admin script using service-role credentials stored server-side only.

Possible implementations:

- Existing `npm run bootstrap:minyan-anchor` extended for batch OSM keys (admin)
- Render cron job / background worker with service role
- Supabase Edge Function invoked by a trusted scheduler (still service-role backed)

Geofence radius remains controlled by `minyan_live_config()` on the server—not by clients.

## Future enhancement: server-side auto-provision on report

A safe backend-only enhancement (not in the mobile app) could provision a missing anchor inside `create_minyan_report` when:

- The OSM key is valid and matches Overpass-fetched geometry from a **server-side** Overpass call or cached admin dataset.
- Upsert runs under service role inside the RPC or a privileged worker—not from the client.
- Concurrency is handled with the existing advisory lock on `synagogue_osm_key`.
- Normal users still cannot mutate anchors directly.

This sprint does **not** implement that path; it remains documented for a future backend iteration.

## Verification

```bash
npm run verify:phase11.1
npm run verify:phase11.2
npm run verify:phase11.1-live   # requires live Supabase + service role
```

Static checks confirm no client `synagogue_anchors` writes and no `upsert_synagogue_anchor` calls from React Native code.
