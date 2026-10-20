# Device QA scenarios (Android / iOS)

Run when `adb devices` shows a connected device or via TestFlight/internal build.

## Podcast

1. Open Parasha podcast player from Home → play/pause, skip ±15, speed change.
2. Download episode → wait for completion → enable airplane mode → play from local file.
3. Tap download again while in progress (should not start duplicate).
4. Force fail (airplane mode before download) → Hebrew error → retry.
5. Remove download → confirm file cleared.

## Map / minyan

1. Grant location → synagogues list + markers load.
2. Select synagogue → create minyan report (authenticated) → accent marker + legend.
3. Update attendance → success message; pull refresh → state persists.
4. Fulfill report → marker returns to default.
5. Deny location → permission panel; no crash.
6. Simulate slow network → prior synagogue list remains visible on error.

## Proximity alerts (foreground)

1. Profile → enable **התראות על מניין בקרבת מקום** + notifications + location.
2. With active report at nearby anchor (or dev override), walk within 150 m → one notification.
3. Stay nearby → no duplicate for same report/expiry.
4. Disable setting → no further alerts.

## RTL / UI spot checks

1. Prayer reader: long Hebrew paragraphs, TOC, font A-/A+.
2. Trivia: option radio alignment, submit flow.
3. Mitzvah detail: title + body alignment.
4. Profile: toggles and legal link.

## Not testable without background location (see background-minyan-alerts.md)

- Alerts when app is killed or after long background suspension.
