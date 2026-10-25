---
name: open-app-screen
description: >-
  Opens a MitzvaPlus screen on the Android emulator and sets the simulated
  location to 110 Gilboa Street, Alfei Menashe, so synagogue search and
  Shabbat and holiday times follow that place. Use when the user asks to
  open a screen, show the app, show the emulator, or use the open-app-screen
  skill.
---

# Open an app screen

Open the requested MitzvaPlus screen on the Android emulator. Default screen is Home. Leave GPS permission, navigation, and the rest of the app as they are.

The default place is 110 Gilboa Street, Alfei Menashe (`src/constants/defaultPlace.ts`). On the emulator, simulated GPS must be that point. A real phone keeps its own GPS fix.

## Run

From the repo root, run:

```bash
node .cursor/skills/open-app-screen/scripts/open-app-screen.mjs [screen]
```

`screen` is one of `home`, `calendar`, `trivia`, `map`, `profile` (Hebrew names `בית`, `יומן`, `טריוויה`, `מפה`, `פרופיל` also work). Omit it to open Home. `המצוות שלי` still aliases to the calendar tab coordinate.

The script starts AVD `MitzvaPlus_API36` when no emulator is connected, points Metro at port 8081, sets the simulated location, opens `com.mitzvahapp.app`, connects the saved dev server if the Expo launcher is showing, and taps the tab.

## Show the window

After the script prints `OPENED`, bring the emulator window forward.

- Click the phone icon on the taskbar, then click the preview so the window is in front.
- Do not resize the emulator window and do not call `SetWindowPos`. Resizing has closed this emulator before.
- Confirm with a screenshot that the requested screen is visible and the place is Alfei Menashe, not Jerusalem.

If the tab tap missed because the splash was still up, wait and run the script again.
