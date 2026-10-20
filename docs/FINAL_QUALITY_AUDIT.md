# MitzvaPlus — Final Quality Audit

**Last updated:** 2026-10-11 (pass 5 — RTL root + map/home visual pass)  
**Status:** **Not closed** — native **visual** QA still required (ADB screencaps were black / lock screen).

---

## Pass 5: Why prior UI/UX looked unchanged + what changed

### Runtime identification

| Signal | Finding |
|--------|---------|
| User Metro (`terminals/1.txt`) | Heavy `[notifications] scheduled` logs → **native dev client via tunnel**, not web-only QA. |
| Pass 3–4 smoke | **`http://localhost:8082` web** — fixes like `document.dir` and `TabScreenFocusGuard` `display: none` apply **only on web**. |
| `adb devices` (pass 5) | **Wireless device** `adb-228c0f57-…` connected. |
| ADB screencap | **~15 KB black frames** — likely **screen off / lock** or wireless capture quirk; **not usable as UI evidence**. |
| Automated browser (`localhost:8082`) | Bundle built (`Web Bundled … index.ts`); `#root` had **0 children** in CDP → **no visual proof** in headless browser this session. |

**Likely root cause the user saw “no change”:** native layout stayed **LTR** (`flex-row` order, tab chrome) while only **text** tokens had `textAlign: 'right'`. `I18nManager.forceRTL` runs in `index.ts` but **first RTL enable on Android often needs a full process kill**, not only Fast Refresh. Map/home polish from earlier passes was **subtle** (plain title + 280px map) compared to user expectation.

**Action for user after pulling pass 5:** kill the app completely → reopen dev client → ensure Metro shows a fresh bundle (tunnel session on `C:\MizvaPlus`).

### Code changes (pass 5)

| Area | Files |
|------|--------|
| RTL root | `src/constants/layoutDirection.ts`, `App.tsx` (`appRootLayoutStyle` wrapper), `src/utils/initializeRtl.ts` (`swapLeftAndRightInRTL`), `global.css` (`html/body/#root { direction: rtl }`) |
| Map UX | `MapScreenHeader.tsx`, `MapFloatingControls.tsx`, `MapScreen.tsx`, `MapScreen.web.tsx`, `GoogleMapsWebView.web.tsx` (map height 340), `SynagogueListCard.tsx` (accent bar + active minyan pill) |
| Home polish | `GreetingHeader.tsx` (hero card + accent border) |
| Cards | `Card.tsx` (elevated border) |
| Tabs | `MainTabNavigator.tsx` (`writingDirection: 'rtl'` on labels) |
| Verify | `scripts/verify-ui-rtl.mjs` (8 checks) |

### Screenshots (this pass)

| Path | Note |
|------|------|
| `docs/qa-screenshots/pass5/before-native/00-current.png` | Black — not valid UI |
| `docs/qa-screenshots/pass5/after-native/00-current.png` | Black — not valid UI |
| `docs/qa-screenshots/pass5/after-web/home-attempt.png` | Black — RN web root empty in automation |

**Visually verified by agent this pass:** **None** (blocked as above).  
**Automated only:** `typecheck`, `verify:ui-rtl` (8/8), `verify:web-tab-focus` (5/5).

### Not verified on native (pass 5)

- RTL flex + tab order after cold start  
- Map header, floating controls, 340px map, synagogue cards  
- Home greeting card  
- Podcast / prayer / trivia screens after RTL root  

---

## Pass 4: Web podcast / tab layering fixes

### Root cause (pass 3 bug)

1. **Inactive bottom-tab scenes on web** stayed in the layout and intercepted clicks (`pointer-events`).
2. **Mini-player** was visible on stack routes (`MitzvahDetail`, etc.) and overlaid action buttons.

### Fixes

| File | Change |
|------|--------|
| `src/navigation/TabScreenFocusGuard.tsx` | On web: `display: none` + `pointerEvents: none` when tab unfocused |
| `src/navigation/tabScreenWrappers.tsx` | Wrap all 5 tab screens |
| `src/navigation/MainTabNavigator.tsx` | Use wrapped tab screen components (keeps `lazy`, `freezeOnBlur`, `detachInactiveScreens`) |
| `src/components/podcast/ParashaPodcastMiniPlayer.tsx` | `isVisible: isOnMainTab && !isOnFullPlayer` |

**Regression:** `npm run verify:web-tab-focus` (5 checks), `verify:parasha-podcast` (+ mini-player rule, 37 checks).

### Web E2E smoke (`http://localhost:8082`, PID 32476 — reused, not killed)

| Scenario | Result |
|----------|--------|
| Home → podcast CTA | **Pass** — opens `ParashaPodcastPlayer` |
| Play / pause | **Pass** — label toggles הפעל / השהה |
| Download on web | **Pass (expected)** — button disabled / unavailable (no native FS) |
| Back from player | **Pass** — returns Home |
| Tabs: Trivia → Home | **Pass** — trivia-only content when on Trivia (no Home bleed) |
| Podcast after tab round-trip | **Pass** — resume CTA opens player |
| Home → תפילין → prayer reader | **Pass** after mini-player fix (no click intercept) |
| Prayer reader sections | **Pass** — Hebrew headings (הכנה, תפילין של יד, …), font A-/A+ |

**Not run on web this pass:** offline download, Supabase minyan RPC, proximity notification toast, account delete confirm flow.

### Port 8082

Still `expo start --web --port 8082` (MizvaPlus). HMR picked up pass 4 changes during smoke.

---

## Pass 3 (summary)

- RTL: removed `direction` from `ScreenContainer`; web `dir=rtl` on `document`; LTR progress tracks.
- Initial web smoke; EADDRINUSE explained.

---

## Automated verification (pass 5 run)

```text
npm run typecheck                      → PASS
npm run verify:ui-rtl                  → 8/8
npm run verify:web-tab-focus           → 5/5
adb devices                            → wireless device (screencap unusable)
```

## Automated verification (pass 4 run)

```text
npm run typecheck                      → PASS
npm run verify:ui-rtl                  → 6/6
npm run verify:web-tab-focus           → 5/5
npm run verify:minyan-proximity-alerts → 21/21
npm run verify:podcast-download        → 9/9
npm run verify:parasha-podcast         → 37/37
npm run verify:phase11.2               → 44/44
adb devices                            → (empty)
```

Static scripts do **not** replace native QA.

---

## Minyan alerts (unchanged product stance)

| State | Supported |
|-------|-----------|
| Foreground (app open) | Code path exists; **not device-verified** |
| Background / killed | **No** — see [background-minyan-alerts.md](./background-minyan-alerts.md) |

---

## Closing checklist (remaining)

1. **Android device** — [device-qa-scenarios.md](./device-qa-scenarios.md): podcast offline download, minyan CRUD on live Supabase, proximity notification within 150 m.
2. **iOS** — same scenarios if shipping iOS.
3. **Background proximity** — product + native config decision only if required.

---

## Summary (three buckets)

### תוקן ואומת (Web runtime, pass 4)

- Tab inactive layers no longer block clicks.
- Podcast open / play / back / tab round-trip.
- Mini-player hidden off main tabs; mitzvah → prayer reader works.
- Trivia tab isolation; prayer reader Hebrew UI.

### תוקן בקוד (pass 5) — **לא אומת חזותית**

- Root RTL layout (`appRootLayoutStyle` + `I18nManager.swapLeftAndRightInRTL`).
- Map screen header, chips, refresh controls, taller map, floating recenter/refresh, synagogue card accents.
- Home greeting hero card.

### תוקן אך לא אומת במכשיר

- Podcast download pipeline (native FS).
- Minyan map mutations + proximity notifications.
- Tab focus guard on **native** (should work via `pointerEvents`; not exercised on device).
- Pass 5 RTL + map/home visuals on **physical display**.

### עדיין פתוח

- All of `device-qa-scenarios.md` on physical hardware.
- Background/killed proximity alerts.
- Full visual RTL audit on every screen size.
- Legal / auth / delete-account flows not smoke-tested on web.
