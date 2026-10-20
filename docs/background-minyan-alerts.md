# Minyan proximity alerts — background capability

## Current product behavior (as implemented)

- Alerts fire when an authenticated user enables **התראות על מניין בקרבת מקום** in Profile.
- Scans run on a timer while the app process is alive, when the app becomes **active**, and briefly when transitioning to **inactive** (app switcher).
- Each scan: foreground location → nearby synagogues (Overpass) → `list_active_minyan_reports` for those OSM keys → Haversine distance ≤ **150 m** → local notification with dedupe by `reportId` + `expiresAt`.

## Why full background / killed-app alerts are not enabled

### Android (`app.config.js`)

- `ACCESS_BACKGROUND_LOCATION` and `FOREGROUND_SERVICE_LOCATION` are listed under **`blockedPermissions`** intentionally (privacy / Play policy posture).
- Only `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` are declared (when-in-use style usage via `expo-location`).

Without background location, the OS will not deliver continuous position updates when the app is killed or suspended for long periods.

### iOS

- `infoPlist` defines **`NSLocationWhenInUseUsageDescription`** only.
- No `UIBackgroundModes` location entry and no “Always” location string.

### Expo APIs

- Reliable geofencing / background location requires additional native configuration and permissions not present in this project.
- `expo-task-manager` / `expo-background-fetch` are **not** installed; background fetch would still not provide precise 150 m proximity without location updates.

## What would be required for true background proximity

1. Product decision to collect background location (privacy policy, Play Data Safety, App Store purpose strings).
2. Add iOS `NSLocationAlwaysAndWhenInUseUsageDescription` and background modes as appropriate.
3. Remove Android background location from `blockedPermissions` and justify in store listing.
4. Implement a supported pattern (e.g. significant-change or geofencing) with `expo-location` / native modules, plus battery and permission UX.
5. **Physical device QA** on both platforms with app killed, Doze, and permission denial paths.

## Foreground vs background vs killed (Expo / OS)

| State | Location updates | Proximity scan | Local notification | Supported today? |
|-------|------------------|----------------|--------------------|------------------|
| **Foreground** (app visible) | `expo-location` when-in-use | `useMinyanProximityAlerts` interval + AppState `active`/`inactive` | `expo-notifications` schedule (~1s) | **Yes** (code path; device not verified) |
| **Background** (app suspended, process may live) | OS may pause JS; no background location permission | Same hook only if JS wakes; **unreliable** | Same if scan runs | **Partial / unreliable** — not product-guaranteed |
| **Killed** (swiped away) | None without background location / geofencing | None | None | **No** — by design + `blockedPermissions` |

Expo references (SDK 57): [Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/). Background location and task managers require explicit native permission strings and config plugins; this project deliberately blocks Android background location in `app.config.js`.

## Verification status

| Scenario | Verified |
|----------|----------|
| Logic (150 m, expiry, dedupe) | `npm run verify:minyan-proximity-alerts` (JS harness) |
| Foreground scan wiring | Static / code review |
| Notification delivery on device | **Not verified** (no device) |
| Background / killed app | **Not implemented** (blocked by config + permissions) |
