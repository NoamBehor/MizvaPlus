# MitzvaPlus UI/UX — Repository Map

Read this file when you need concrete paths for audit, reuse, or verification.

## Design tokens and theme

| Resource | Path |
|----------|------|
| Colors | `src/constants/colors.ts` |
| Spacing, typography, shadows, radii | `src/constants/theme.ts` |
| Home-specific theme | `src/constants/homeTheme.ts` |
| Timer themes | `src/constants/timerThemes.ts` |
| Holiday themes | `src/constants/holidayThemes.ts` |
| Event themes | `src/constants/eventThemes.ts` |

Typography defaults are Hebrew-first: `textAlign: 'right'`, `writingDirection: 'rtl'`.

## Shared layout and primitives

| Component | Path |
|-----------|------|
| Card | `src/components/common/Card.tsx` |
| ScreenContainer | `src/components/common/ScreenContainer.tsx` |
| ProgressBar | `src/components/common/ProgressBar.tsx` |
| AppErrorBoundary | `src/components/common/AppErrorBoundary.tsx` |
| PlaceholderScreen | `src/components/common/PlaceholderScreen.tsx` |

Styling stack: React Native `StyleSheet` + theme tokens + NativeWind/Tailwind class names where already used.

## Home screen

| Resource | Path |
|----------|------|
| Home screen composition | `src/screens/home/HomeScreen.tsx` |
| Greeting header | `src/components/home/GreetingHeader.tsx` |
| Weekly Parasha card | `src/components/home/WeeklyParashaCard.tsx` |
| Themed timer banner | `src/components/home/ThemedTimerBanner.tsx` |
| Today mitzvot card | `src/components/home/TodayMitzvotCard.tsx` |
| Progress summary | `src/components/home/ProgressSummary.tsx` |
| Daily trivia card | `src/components/home/DailyTriviaCard.tsx` |
| Daily learning card | `src/components/home/DailyLearningCard.tsx` |
| Streak / XP cards | `src/components/home/StreakCard.tsx`, `src/components/home/XpCard.tsx` |
| Holiday prep | `src/components/home/HolidayPrepCard.tsx` |
| Next event | `src/components/home/NextEventCard.tsx` |

## Onboarding and startup

| Resource | Path |
|----------|------|
| Splash | `src/screens/onboarding/SplashScreen.tsx` |
| Onboarding | `src/screens/onboarding/OnboardingScreen.tsx` |
| App entry | `App.tsx` |

## Calendar and Parasha (read-only for UI)

| Resource | Path |
|----------|------|
| Calendar hook | `src/hooks/useHebrewCalendar.ts` |
| Calendar types | `src/types/calendar.ts` |
| Calendar service | `src/services/calendar/calendarService.ts` |

UI must consume `dayInfo.weeklyParasha` from the calendar hook/service. Do not recalculate Parasha in components.

## Location (read-only for UI)

| Resource | Path |
|----------|------|
| User location hook | `src/hooks/useUserLocation.ts` |
| Zmanim location hook | `src/hooks/useZmanimLocation.ts` |
| Location service | `src/services/location.ts` |
| Web location | `src/services/location.web.ts` |

UI shows location status; resolution logic stays in services/hooks.

## Timer and events (read-only for UI)

| Resource | Path |
|----------|------|
| Next upcoming event | `src/hooks/useNextUpcomingEvent.ts` |
| Holiday context | `src/services/holidayContext/` |
| Event descriptors | `src/constants/eventDescriptors.ts` |

Improve timer presentation via existing theme resolution; do not duplicate event detection.

## Podcast (read-only for UI)

| Layer | Path |
|-------|------|
| Hook | `src/hooks/useParashaPodcast.ts` |
| Context | `src/context/ParashaPodcastContext.tsx` |
| Service | `src/services/podcast/parashaPodcastService.ts` |
| Home card | `src/components/podcast/ParashaPodcastCard.tsx` |
| Player screen | `src/screens/podcast/ParashaPodcastPlayerScreen.tsx` |

Architecture: `UI → Hook → Service → Provider → Backend`. Reuse shared playback; do not duplicate audio instances.

## Quiz and trivia

| Resource | Path |
|----------|------|
| Trivia screen | `src/screens/trivia/TriviaScreen.tsx` |
| Quiz service | `src/services/quiz.ts` |
| Home trivia card | `src/components/home/DailyTriviaCard.tsx` |

Do not change answer validation logic for visual upgrades.

## Gamification (read-only for UI)

| Resource | Path |
|----------|------|
| Gamification store | `src/store/gamificationStore.ts` |
| Mitzvah store | `src/store/mitzvahStore.ts` |

Do not change XP or streak calculation for visual upgrades.

## Verification scripts

Run relevant scripts after UI changes that touch these areas:

| Area | Script |
|------|--------|
| Timer themes | `node scripts/verify-timer-theme.mjs` |
| Countdown | `node scripts/verify-countdown.mjs` |
| Location | `node scripts/verify-location.mjs` |
| Parasha podcast | `node scripts/verify-parasha-podcast.mjs` |
| Holiday context | `node scripts/verify-holiday-context.mjs` |

Also run TypeScript check when available (`npx tsc --noEmit` or project equivalent).

## Protected systems (do not modify for UI-only tasks)

- `src/services/auth/`
- `src/services/cloud/`
- `src/services/minyanLive/`
- `src/services/texts/` (Prayer Reader)
- `src/services/notificationScheduler.ts`
- `src/navigation/`
- Supabase migrations under `supabase/migrations/`
