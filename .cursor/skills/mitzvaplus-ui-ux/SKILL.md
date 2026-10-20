---
name: mitzvaplus-ui-ux
description: Improves visual design, hierarchy, interaction, accessibility, motion, and polish for the MitzvaPlus React Native/Expo app incrementally on the existing codebase. Use for UI redesign, visual polish, Home screen, onboarding, cards, progress bars, quiz, daily learning, timers, location UX, animations, spacing, typography, hierarchy, accessibility, or responsive behavior. Does not own backend, database, auth, calendar, location-service, or business-logic work unless explicitly required by the UI task.
---

# MitzvaPlus UI/UX

High-quality UI/UX design and implementation for the existing **MitzvaPlus** React Native / Expo application.

**Primary principle:** Improve the existing product without changing its established business logic or architecture.

This is NOT a redesign-from-scratch skill. The goal is **MitzvaPlus 2.0**, not a new application.

## Scope

Especially useful for:

- Home screen UX
- Hebrew / RTL mobile UI
- Onboarding and startup experiences
- Cards and sections
- Progress visualization
- Quiz UI
- Daily learning UI
- Timers
- Location/status presentation
- Loading / empty / error states
- Subtle motion and interaction polish
- Accessibility
- Visual consistency

Do **not** take ownership of unrelated backend, database, authentication, calendar, location-service, or business-logic work unless explicitly required by the UI task.

## Product visual identity

MitzvaPlus should feel:

- Modern
- Warm
- Jewish
- Premium
- Calm
- Trustworthy
- Human
- Editorial
- Simple

Avoid:

- AI-demo aesthetics
- Neon
- Futuristic/cyber styling
- Excessive glassmorphism
- Excessive gradients
- Dashboard / enterprise appearance
- Excessive decorative icons
- Excessive animation
- Visually noisy layouts

The design should feel like a polished consumer mobile product.

## Required workflow

For every significant UI/UX task:

```text
Audit
↓
Identify existing implementation
↓
Identify reusable abstractions
↓
Design proposal
↓
Minimal implementation
↓
Typecheck
↓
Relevant verification
↓
Regression check
```

Do not perform broad refactors simply because you see unrelated issues. If unrelated problems are discovered, report them separately.

## Repository-first rule

Before changing code:

1. Inspect the repository.
2. Find the current implementation.
3. Identify existing reusable components.
4. Identify the existing theme/design tokens.
5. Identify existing layout helpers.
6. Identify the current source of truth for the displayed data.
7. Identify the minimum files required for the change.

Never redesign from assumptions. Existing implementation is the source of truth.

See [reference.md](reference.md) for key file paths.

## Reuse existing architecture

Always prefer:

`existing component → upgrade it`

over:

`new duplicate component → replace old component`

Reuse existing:

- Theme, colors, typography, spacing, shadows, radii
- Buttons, icons, layout helpers, RTL helpers
- Animation patterns, skeletons
- Existing services/hooks

Do not introduce a second design system.

## Critical business-logic protection

UI work must **NOT** silently change:

- Hebrew calendar calculations
- `dayInfo.weeklyParasha`
- Zmanim calculations
- Location resolution logic
- XP calculation
- Streak logic
- Quiz answer validation
- Authentication
- Supabase contracts
- Podcast architecture
- Navigation architecture
- Storage architecture
- Minyan Live logic
- Prayer Reader logic
- Maps logic
- Notification logic

Default assumption: **presentation change only.**

If a requested visual improvement appears to require a business-logic change:

1. Identify the dependency
2. Explain the current behavior
3. Explain the proposed change
4. Explain the impact
5. Do not silently modify the logic

If the task reveals a conflict between UI requirements and business logic, stop before changing the logic and explain the conflict.

## Domain rules

### Calendar

The Calendar system is the source of truth for the weekly Parasha.

Use `dayInfo.weeklyParasha`. Do not calculate the Parasha again inside UI components.

### Location

The existing location service is authoritative. Do not create a second location pipeline.

The UI should consume the existing location result and clearly communicate whether the app is using:

- Current GPS
- Cached location
- Fallback / Jerusalem

Do not move location logic into UI components.

### Timer

The existing thematic timer engine is authoritative. Do not create a second holiday/event detection system.

Reuse existing event metadata and timer theme resolution. Improve presentation, not event logic.

### Podcast

Podcast has its own existing architecture:

`UI → Hook → Service → Provider → Backend`

and existing shared playback infrastructure.

UI/UX work must not create a new Podcast playback system or duplicate audio instances. Use the existing Podcast architecture.

### RTL / Hebrew-first

MitzvaPlus is Hebrew-first. All UI work must preserve:

- RTL
- Hebrew typography
- Right alignment
- Correct layout direction
- Existing RTL helpers
- Accessibility in Hebrew

Do not introduce local RTL hacks when an existing helper exists.

## Implementation quality

UI improvements should consider:

- Visual hierarchy, spacing, typography, content density
- Affordances, accessibility, animation, responsive behavior
- Small/large content
- Loading, empty, error, and completed states
- Safe-area handling
- Web behavior where applicable

High-frequency state (timers, audio progress, animations) must not unnecessarily rerender the whole Home screen. Prefer isolated state and memoized presentation where appropriate.

## Accessibility

All interactive UI should preserve or add:

- `accessibilityRole`
- `accessibilityLabel`
- `accessibilityState`

Progress indicators, timers, quiz progress, and important content must remain understandable to screen readers.

## Motion

Use motion to improve hierarchy and interaction.

Prefer:

- Subtle transitions
- Entrance animations
- Completion feedback
- Page transitions
- Interaction feedback

Avoid:

- Infinite decorative animations
- Expensive animation loops
- Excessive parallax
- Motion that distracts from content

Respect reduced-motion behavior when supported by the existing project.

## Dependencies

Do not add new dependencies unless:

- The existing project cannot reasonably support the requested UI
- The dependency is genuinely necessary
- The reason is explicitly documented

Prefer the existing stack and existing utilities.

## UI/UX roadmap priorities

These are UI/UX priorities, not permission to rewrite underlying business logic:

1. Improve the startup/onboarding page-turn experience.
2. Always show a clear Weekly Parasha section regardless of Podcast availability.
3. Upgrade the Daily Quiz to a 10-question experience with visible difficulty progression and a very hard final question.
4. Make Daily Mitzvot completion percentage and progress substantially more prominent.
5. Improve Daily Learning with meaningful recurring Jewish learning, with Tehillim as a primary candidate.
6. Make the Home timer more prominent and context-aware using existing holiday/mitzvah timer logic.
7. Improve location UX at app entry while preserving the existing location-resolution pipeline and Jerusalem fallback.

## Output expectations

When working on a UI/UX task, report:

1. Current implementation discovered
2. UI problem identified
3. Proposed visual solution
4. Files to change
5. Business logic preserved
6. Implementation completed
7. Verification results
8. Remaining issues

## Final principle

Always optimize for:

**clarity + polish + usability + consistency + accessibility + maintainability**

while preserving:

**existing business logic + existing architecture + existing source-of-truth systems.**

## Additional resources

- For repository map and verification scripts, see [reference.md](reference.md)
