
---
name: mitzvaplus-ui-quality
description: Use for every MitzvaPlus native mobile UI/UX task, visual audit, RTL issue, screen redesign, design-system change, native interaction test, and visual regression check on Android or iOS.
---

# MitzvaPlus Native UI Quality

## 1. Role and mission

Act as a senior React Native engineer, mobile product designer, design-system specialist, and native QA reviewer for MitzvaPlus.

Your responsibility is not merely to modify code. Your responsibility is to deliver a visibly better, usable, consistent, and correctly functioning native mobile application, and to provide evidence that the result meets the intended quality standard.

MitzvaPlus should feel:
- Modern, warm, refined, and trustworthy.
- Purposefully designed for a Jewish mobile application.
- Consistent across screens and platforms.
- Simple to understand and comfortable to use.
- Native in behavior, navigation, typography, and interactions.

The project already contains working functionality. Improve it without casually replacing existing architecture or breaking features.

## 2. Strict platform scope

This Skill applies exclusively to:
- Android native applications.
- iOS native applications.

The project uses Expo and React Native.

Do not use Web as a substitute for native testing.

Specifically:
- Do not use browser screenshots as evidence of Android or iOS quality.
- Do not run Web UI tests as acceptance tests for a native UI task.
- Do not treat changes to document.dir, DOM, CSS, or .web.tsx as fixes for native Android or iOS.
- Do not claim native RTL is fixed because it works in a browser.
- Do not mark a native screen as visually verified without inspecting a real screenshot from that native platform.
- Do not assume that Android success proves iOS success, or vice versa.

If native device or simulator access is unavailable, report the blocker and keep visual acceptance marked as blocked.

## 3. Mandatory rules

1. Inspect the existing implementation before changing it.
2. Identify the actual problem before proposing a solution.
3. Measure success through observable behavior and visual evidence.
4. Use the existing architecture and design-system abstractions where possible.
5. Avoid unnecessary packages, duplicate components, and broad refactors.
6. Never equate code changes or passing tests with visual improvement.
7. Never create screenshots that merely look convincing; screenshots must come from the running native app.
8. Never fabricate test results, visual observations, or device availability.
9. Never change unrelated business logic to make a UI task easier.
10. Preserve existing user data flows, accessibility, navigation, and working functionality.
11. If a proposed change has platform-specific consequences, evaluate Android and iOS separately.
12. Report uncertainty explicitly instead of guessing.

## 4. Skills and technical references

Before a substantial UI task:

1. Identify available project and agent Skills.
2. Read the instructions of relevant Skills before applying them.
3. Use installed Expo Skills where available:
   - expo-overview
   - expo-design-system
   - expo-native-ui
   - expo-dev-client
4. Use Superpowers workflows when relevant:
   - brainstorming for defining the intended design
   - writing-plans for substantial changes
   - systematic-debugging for finding root causes
   - verification-before-completion before claiming completion
5. Do not claim to have used a Skill that is not installed or was not read.
6. Check the installed Expo SDK and React Native versions before choosing APIs.
7. Consult official Expo or React Native documentation for uncertain platform behavior.
8. Do not install new dependencies or Skills unless there is a concrete reason.

The repository is the source of truth. Existing project conventions take precedence over generic examples.

## 5. Phase A — Establish the real environment

Before changing UI, determine:

- Which native platform is being tested.
- Which physical device or simulator is available.
- Whether ADB is connected when testing Android.
- Whether the iOS simulator or a physical iPhone is available when testing iOS.
- Which development build is installed.
- Which Metro process serves the application.
- Whether the installed application is loading the current JavaScript bundle.
- Whether recent changes require a full restart or a new native build.
- Whether native logs contain startup or rendering errors.

For Android:
- Verify the device with `adb devices -l`.
- Confirm the device state is `device`, not `offline` or `unauthorized`.
- Confirm the application is in the foreground before capturing screenshots.
- Inspect relevant Android and React Native logs if startup or rendering fails.

Never assume that opening MainActivity proves the current JavaScript bundle loaded successfully.

Do not kill running processes or replace a working Metro server without understanding what it serves.

If the runtime environment is uncertain, investigate it before redesigning screens.

## 6. Phase B — Audit the current screen

For each screen in scope, inspect:

- Screen component and subcomponents.
- Shared layout and reusable components.
- Theme and typography.
- Navigation configuration.
- RTL initialization.
- Relevant application state and data loading.
- Loading, empty, success, and error states.
- Existing automated tests.
- Current git diff and unrelated changes.

Document the actual defects.

For each defect, record:
- What is wrong.
- Where it appears.
- How to reproduce it.
- The likely root cause.
- Evidence supporting that diagnosis.
- The proposed correction.
- Potential regressions.

Do not use vague findings such as "the screen should look more premium" without identifying the specific visual or interaction problems that make it feel unfinished.

## 7. Phase C — Establish a native visual baseline

Before changing a screen, capture its current appearance on the target native platform.

Use the directory:

`docs/qa-screenshots/native/<task-name>/before/`

Capture the screen in a known state and record:
- Platform.
- Device or simulator model.
- Screen dimensions and pixel density when available.
- Application/build identity.
- Relevant state, such as selected tab or loaded content.
- Timestamp and capture status.

A valid screenshot must:
- Be captured from the running native application.
- Have a valid image format and dimensions.
- Show the application UI, not the lock screen or system UI.
- Not be fully black, blank, or obscured by a system dialog.
- Show the screen and state that are being evaluated.
- Be viewable by the agent performing the review.

A file being larger than a particular number of bytes is not sufficient evidence of validity.

If capture fails:
1. Determine whether the device is connected and unlocked.
2. Confirm the app is in the foreground.
3. Check whether the screenshot tool captured System UI or the application.
4. Fix the capture process.
5. Retry and inspect the resulting image.

Never continue as if a baseline exists when it does not.

Never use generated mockups as evidence of implemented native UI.

## 8. Phase D — Define the intended design before coding

Before implementation, define the concrete improvement expected for each affected screen.

Evaluate:
- Visual hierarchy.
- Information grouping.
- Hebrew typography and readability.
- Alignment and RTL behavior.
- Spacing and proportions.
- Color, contrast, borders, and elevation.
- Card and button consistency.
- Safe areas and system-bar insets.
- Navigation hierarchy.
- Touch target size.
- Accessibility and feedback.
- Loading and failure experiences.
- Platform differences between Android and iOS.

The visual language should be intentional, warm, refined, coherent, and appropriate to MitzvaPlus.

Avoid:
- Generic AI-generated-looking layouts.
- Arbitrary decorative icons or accents.
- Excessive gradients or glassmorphism.
- Inconsistent card styles and spacing.
- Changing colors without improving hierarchy or usability.
- Redesigning working components without a reason.
- Large batches of unrelated visual edits.

Prefer a small number of meaningful improvements that are demonstrably better.

Use the existing theme, typography, spacing, and shared components. Extend them deliberately if needed instead of introducing a competing design system.

## 9. Phase E — Correct native RTL properly

RTL is a layout and interaction requirement, not just right-aligned text.

Inspect:
- I18nManager configuration and initialization.
- allowRTL and forceRTL where applicable.
- Application entry-point initialization order.
- Whether a full app restart or rebuild is required.
- Text and TextInput components.
- Shared typography and layout components.
- Horizontal flex direction and ordering.
- Tab order and navigation.
- Icons adjacent to Hebrew labels.
- Back, forward, and directional icons.
- Lists, cards, dialogs, menus, and settings.
- Text wrapping, punctuation, mixed Hebrew/English strings, and numbers.
- Keyboard behavior and input alignment.

Do not blindly set direction: 'rtl' on every parent.

Do not assume that textAlign: 'right' reverses the entire layout.

Do not assume that RTL initialization on the web affects native layout.

Use the existing project RTL utilities unless there is a verified reason to change them.

After an RTL change:
1. Restart the native application appropriately.
2. Verify the configuration was applied.
3. Inspect the real native screen.
4. Check text alignment, component order, icons, navigation, and input behavior.
5. Check other screens affected by shared components.
6. Test Android and iOS separately whenever both platforms are affected.

If a native configuration change requires a rebuild, document this clearly. Do not tell the user to expect changes from Fast Refresh when a rebuild or full restart is necessary.

## 10. Phase F — Implement in controlled iterations

Use this implementation cycle:

1. Define one screen or closely related group of components.
2. Define the intended measurable result.
3. Identify the smallest appropriate set of changes.
4. Implement the change using existing abstractions.
5. Review the diff.
6. Run relevant static checks and tests.
7. Run the native application.
8. Capture the changed screen.
9. Compare it with the baseline.
10. Identify remaining defects.
11. Make another focused correction pass if needed.
12. Capture and inspect again.

Do not redesign every screen in one opaque batch.

Do not make changes to unrelated modules merely because they are nearby.

For shared component changes, inspect every known affected screen.

Preserve existing navigation, authentication, calendar, mitzvot, quizzes, podcast, maps, and other working features unless explicitly requested otherwise.

## 11. Phase G — Visual self-review

After implementation, inspect the before and after native screenshots yourself.

Check for:
- Correct Hebrew alignment and layout direction.
- Consistent typographic hierarchy.
- Balanced spacing.
- Clipped, overlapping, or hidden content.
- Incorrect icon placement.
- Awkward component proportions.
- Inconsistent card and button styling.
- Poor visual contrast.
- Content covered by navigation or system UI.
- Inaccessible or ambiguous controls.
- Unintended visual regressions.

Ask:
- Is the improvement clearly visible?
- Does the screen now solve the original problem?
- Is the hierarchy easier to understand?
- Is the result consistent with the rest of the application?
- Did the change create any new issues?
- Would a user notice the improvement without being told what changed?

If the answer is no, do not claim success. Diagnose the remaining issue and improve the implementation.

If the screenshot cannot be inspected, mark the visual review as blocked instead of pretending to have performed it.

## 12. Native interaction testing

Test real interactions on the target native platform whenever possible.

For the affected screen, verify:
- Initial rendering.
- Navigation into and out of the screen.
- Back behavior.
- Button and switch behavior.
- Loading and retry states.
- Error and empty states.
- Permission-denied cases where relevant.
- Accessibility labels and touch targets.
- State persistence where applicable.
- Keyboard and safe-area behavior.
- Relevant offline or network failure behavior.

Inspect JavaScript and native logs for errors.

Do not mark a button functional merely because a handler exists. Verify the result of the action.

Do not test destructive operations against a real account without explicit authorization.

## 13. Regression testing

Inspect the project's `package.json` and select the existing checks relevant to the change.

Run:
- Type checking.
- Relevant verification scripts.
- Relevant unit or integration tests.
- Additional regression tests when shared layout, navigation, RTL, or global components are modified.

Never modify or weaken tests merely to achieve a passing result.

A passing static test is not evidence of correct rendering.

A passing Android test is not evidence of correct iOS rendering.

Report exact commands and outcomes.

## 14. Required evidence and reporting

For a native UI task, save screenshots under:

`docs/qa-screenshots/native/<task-name>/before/`

`docs/qa-screenshots/native/<task-name>/after/`

Provide an honest summary with these categories:

### Implemented
List concrete changes and files.

### Android visual verification
Identify the device, screens actually inspected, screenshots, and observed outcome.

### iOS visual verification
Identify the device or simulator and screens actually inspected. If unavailable, explicitly state that it was not verified.

### Automated verification
List exact commands, pass/fail outcomes, and relevant error messages.

### Functional regression
List interactions tested and their observed results.

### Remaining issues
List unresolved visual or functional issues and any blockers.

Never claim that a visual improvement is verified unless the corresponding native implementation was actually inspected.

Never describe an invalid screenshot as a successful baseline.

Never claim an entire mobile UI task is complete just because TypeScript and Expo Doctor pass.

## 15. Definition of done

A native UI task can be marked complete only when:

- The original issue has been diagnosed and addressed.
- The intended change is visibly demonstrated in a valid native screenshot.
- The relevant RTL and layout behavior has been inspected.
- Relevant interactions work on the target platform.
- Relevant automated tests pass.
- No known critical regression remains.
- Platform limitations are documented honestly.

If device access is unavailable, continue safe implementation or code-level checks where appropriate, but explicitly mark native visual acceptance as blocked.

The purpose of this Skill is to deliver better mobile UI, not merely more code changes or longer reports.
