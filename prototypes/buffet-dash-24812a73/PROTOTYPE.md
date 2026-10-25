# Buffet Dash

A Canvas buffet game with a 100-second round. Fully eat portions at the home table to bank points. Bronze: 200; silver: 320; gold: 450. Timeout ends every run regardless of target.

## Controls (keyboard on desktop; touch mode on phones/tablets — see the touch section below)
- Any key (except H and modifier keys), click or tap starts a round, or plays again after time-out, once the start/end screen has been up for 1 second. Backspace restarts at any time. H toggles Help (Esc also closes it).
- WASD / arrows move.
- Next to a counter, standing still for 1 second, or pressing E, fills a ring around the player; when full the plate popup opens (also when the plate is full: no room check). Movement is locked while it is open. Drag the food (touch or mouse) or use WASD / arrows to move it; tap the food or press E to place. R rotates, F auto-places, Esc cancels. After a cancel or a completed serve the ring only restarts after moving or pressing E.
- E, or tapping the round on-screen EAT button, eats portions in pickup order at home. Moving pauses eating; partial bites resume.
- After placing, the plate popup stays open while the portion is served; the portion fills and a progress bar runs on the popup. Movement is locked until it is packed; Esc cancels (nothing is added).
- Pointer input exists only inside the plate popup (drag / tap the food) and on the on-screen EAT button. No other buttons and no tap-to-walk.

## Implemented mechanics
The visible 4×3 plate checks exact clicked cells for bounds and overlaps. Dashed outlines show suggested placement or pointer fit feedback. Invalid placements lose no food; the round clock continues. Serving reserves cells and adds food only after completion. Completed eating credits points and frees cells. Unfinished portions never score. Restart clears inventory, progress, destination, held keys, score, and timers.

| Food | Footprint | Value | Serve | Eat (pre-Feast) |
| --- | --- | --- | --- | --- |
| Berry bites | 1×1 | 7 | 0.35s | 0.33s |
| Golden rolls | 2×1 | 19 | 0.7s | 0.67s |
| Green skewers | 1×3 | 30 | 0.9s | 0.93s |
| Chicken leg (was Sushi pair) | 3-cell L (2×2 box) | 42 | 1.28s | 1.15s |
| Royal roast | 2×2 | 48 | 1.75s | 1.73s |

## Assumptions
Values and medal goals are initial tuning choices. Roast has high portion value but lower points per cell and slower processing than distant sushi. Nearby berries fill gaps quickly. Movement is 190 map units/second. Serving range is 102 units; home range is 78. Furniture is decorative and traversable to avoid pathfinding traps. The clock continues when the tab is hidden; elapsed time is reconciled on the next frame. Help and portrait rotate guidance pause the round explicitly.

## Evaluation question
Do plate packing and the return-to-table eating cost create interesting choices under time pressure?

## Known limitations and verification
No obstacles, NPCs, sound, persistence, discard, or manual rearrangement. Map labels scale down on narrow screens. Plate placement uses HTML buttons alongside the Canvas room. Balance and goals need human playtesting. Existing npm scripts, dependency versions, strict TypeScript configuration, and relative Vite base are preserved.

Verified on 2026-10-18: the factory's strict TypeScript/Vite production build passed. A manual browser check covered explicit start, click-to-walk, station-gated timed serving, manual placement, bounds/overlap rejection, rotation, auto-placement, returning home, eating to bank points, timeout with uneaten food, and restart. The observed round ended with 7 banked and 38 uneaten. The browser reported no warning/error logs during the check. No automated tests were added or run. Balance, medal targets, touch layouts, and complete keyboard/device coverage remain unverified.

## Landscape and touch shell (2026-10-19)

The height-bounded layout targets 568x320, 667x375, 844x390, 667x280 and desktop 1280x720 CSS pixels. The HUD, map and essential actions stay in one landscape viewport; instructions are in Help. The actual Canvas box is fitted to the available region at its original aspect ratio, and pointer input uses that box after resizing. High-DPI rendering is retained. Portrait guidance pauses the same round until landscape returns; Help uses a native modal dialog, pauses simulation, clears held movement and resumes without resetting state. Browser zoom remains available.

Shared controls: #help opens #help-dialog; #help-close closes it. Escape closes the dialog through native browser behavior. #restart starts a fresh run. No gameplay tuning, dependency versions, scripts or relative Vite base changed. This retrofit does not certify older exported starter copies.

Touch: #start begins the 100-second round; tap #game to walk to a station, #serve selects its food, then tap one of the twelve #plate button cells (row-major) or #auto. #rotate swaps a selected rectangular portion's footprint. #cancel cancels the current action. Walk HOME and #eat to bank fully eaten portions. Packing, rotation, automatic placement, Serve/Eat/Cancel and Restart remain co-visible. Compact maps render station/home labels at 10 CSS pixels and omit tiny secondary map text; the contextual prompt reports value/footprint, and activity reports serving/eating times. Plate cells are a dense grid with individual row/column accessible names, fit previews and food/value labels; action buttons retain 44-pixel minimum targets. Status and current action/progress remain visible beside the map/plate.

Verified 2026-10-19: existing strict TypeScript / production build passed. Scratch Chromium and WebKit emulation covered all five declared viewport sizes with no button clipping/overlap, action-target failures, document overflow or uncaught page errors; screenshots were retained locally. Help/portrait pause was checked at the smallest size. A real touch smoke at 568x320 covered rotation/manual packing/19 points banked/restart. Full trusted touch-gameplay scenarios remain a subsequent verification gate. No physical-device verification is claimed here; human readability, comfort and balance remain playtest questions.

## Overhead art pass (2026-10-22)

The Canvas room is redrawn in a 3/4 overhead RPG style using vector paths only (no sprites or image assets); all art lives in `src/art.ts`, and `draw()` in `src/main.ts` calls into it.

- Room: tiled floor, back wall with windows and sign, round home rug whose radius matches the 78-unit home range. Serving-range circles (102 units) remain on the floor.
- Stations: buffet counters (lit top surface + front face) in each food's color, with a drawn dish per food, a nameplate, and a footprint grid. On compact maps the nameplate sits below the counter (still 10 CSS px) so the dish stays visible.
- Home table: wooden table, place setting, two chairs.
- Player: original chibi diner (knit beanie, napkin bib). Faces front by default; back and side views plus a walk bob while moving.
- Depth: stations, table and player are drawn in y order, so the player can stand behind a counter. A "!" bubble appears over the player while in serving range. Ready/end messages use a bordered dialogue box.

Other changes in this pass:
- Spawn moved from the table centre to just behind the table (58 units north), still inside home range, so the player no longer overlaps the table art. Starting distances to stations change slightly; no tuning values changed.
- Q is a keyboard shortcut for Serve (E already eats).
- `ui()` now only writes DOM text and plate-cell attributes when their values change, instead of on every frame.

Verified 2026-10-22: strict TypeScript / production build passed. Headless Chromium at 1280x720 and 568x320 covered start, keyboard and tap movement, Q serve, auto-place, return home, eat to bank points and restart, with no page errors. Visual quality, readability and balance remain playtest questions.

## Hall layout, walls, pathing and placement popup (2026-10-22)

- World is now a 1440x880 hall viewed through the same 900x520 canvas; the camera follows the player and clamps at the edges. A minimap (top right) shows walls, stations, table, player and the current view; tapping it walks there.
- Layout (`src/world.ts`): bakery wing on the left (Golden rolls, open to the south), Green skewers top centre, Sushi bar room top right (entered from the carvery through a doorway on its south-east side), carvery wing bottom right (Royal roast, door at y 580-700), Berry bites bottom left, home table in the central dining area with two pillars.
- Walls, counters, the table and its chairs are solid. Keyboard movement slides along obstacles (axis-separated collision, player radius 12). Tap-to-walk uses 8-way grid A* (20-unit cells, no corner cutting) with line-of-sight smoothing; taps on obstacles walk to the nearest reachable point. This replaces the earlier "furniture is decorative and traversable" assumption.
- Placement is a canvas popup instead of the side-panel-only grid. While it is open the player cannot move; movement keys move the cursor and E / Place confirms. The side-panel plate stays as a live view and its cells also move the cursor.
- Balance: travel distances are roughly 1.5-2x longer than the previous room (for example home to Sushi now runs through two doorways). Movement speed, ranges, food values and medal goals are unchanged, so medal targets likely need retuning after playtesting.

Verified 2026-10-22: strict TypeScript / production build passed. Headless Chromium at 1280x720 and 568x320 pathed (via minimap taps) to all five stations and home, opened the popup at each, confirmed movement keys do not move the player while it is open, placed with E or Auto-place, and banked 76 and 56 points across two rounds with no page errors.

## Keyboard-only HUD pass (2026-10-22)

- Side panel removed. The plate (value, free cells, 4x3 grid, serving reservation, activity text and progress bar) is drawn on the canvas directly under the minimap. The camera keeps the player in the area left of that column, so the HUD never covers them.
- All pointer input removed (canvas/minimap taps, popup cell taps, Start/Help/Restart/Serve/Eat/Rotate/Auto-place/Cancel buttons). Every action has a hotkey (see Controls). Pathfinding is still used for 1–5 and Space auto-walk.
- Key indicators: keycaps on each counter's nameplate (1–5) and on the home table (Space); station numbers on the minimap; a contextual prompt above the player ("Q Serve" at a counter, "E Eat" at home with food); key rows in the plate popup and the start/end dialogue; kbd chips in the header (H, Backspace) and a key legend under the map. On short screens the legend shrinks and the contextual text line under the map is hidden.
- Touch-only devices can no longer play. This supersedes the touch requirements in "Landscape and touch shell (2026-10-19)" above; the landscape fitting and Help/portrait pause still apply.

Verified 2026-10-22: strict TypeScript / production build passed. Headless Chromium at 1280x720 and 568x320: no buttons or clickable elements in the DOM; a canvas click does not start the round; Enter starts; H opens and closes Help; 5 and 4 auto-walk to Royal roast and Sushi pair; Q opens the popup; movement keys move only the cursor; F auto-places; Space walks home; E eats and banks 76; Backspace restarts; 3 then Q, E places from the popup. No page errors.

## Dwell-to-serve ring and popup touch (2026-10-22)

- Standing still within serving range of a station with room on the plate fills a 1-second ring (in the station's colour) around the player; when full, the plate popup opens. Q still opens it instantly. Any movement resets the ring. Cancelling or finishing a serve locks the ring until the player moves, so it does not reopen in a loop. If the default orientation has no fit but the rotated one does, the popup opens rotated.
- Inside the popup, pointer/touch is back: drag the food to move it (it keeps the grab offset), tap an empty cell to move it there, tap the food without dragging to place it. Keyboard controls are unchanged.

## On-screen EAT button (2026-10-22)

- A round EAT button (fork + plate glyph, "E" keycap) sits at the bottom-right of the play area, left of the minimap/plate column, at least ~64 CSS px across. It is dimmed unless the player is at home with food and not serving; it pulses when tapping will start eating, and shows percentage plus a progress ring while eating. Tap or click it to eat; it is hidden while the plate popup is open.

## Serving inside the popup (2026-10-22)

- Placing no longer closes the plate popup. The popup switches to a serving view: title with time left, the placed portion filling bottom-up in its colour, a progress bar under the grid, and an Esc Cancel key row. It closes when the portion is packed. Movement, auto-walk, pointer input and the EAT button are disabled while serving, so "moving cancels serving" no longer applies; Esc is the only cancel.

## Auto-walk removed for the player (2026-10-22)

- The 1–5 (walk to station) and Space (walk home) hotkeys, the path-following in the movement loop, the destination marker, and the 1–5 / Space keycaps and minimap numbers are removed. The player moves only with WASD / arrows.
- The A* system is kept in `src/world.ts` (`setObstacles` builds the walkable grid; `findPath(from, goal)` returns smoothed waypoints) for future use such as NPCs; nothing in `main.ts` calls `findPath` now. Earlier sections that mention tap-to-walk, minimap taps or 1–5 / Space auto-walk describe superseded behaviour.

## E replaces Q for serving (2026-10-22)

- Q is removed. E is context-sensitive: at a counter it starts the 1-second ring (even right after a cancel or serve), in the popup it places, at home it eats. The contextual prompt now reads "E Serve" at counters.
- The ring and E no longer check for room on the plate before opening the popup; if nothing fits, the popup shows the red ✕ cursor and Esc closes it.

## Timing tune (2026-10-22)

- Serve times halved and eat times divided by 3 (eating 3x as fast); the table above shows the new values (eat times are exact thirds in code, e.g. 5.2/3, displayed to 2 decimals). Values, footprints, movement, ranges, the 1-second serve ring and medal goals are unchanged. Faster processing offsets the longer walks in the larger hall, but medal targets still need playtesting.

## Touch mode for phones and tablets (2026-10-22)

- Touch mode turns on automatically for coarse pointers (`(pointer: coarse)`) or on any touch, and switches back on any keyboard key except H. It adds `html.touch`; desktop keyboard mode shows no buttons.
- Start: Start button (bottom of the map) or tap the map; "Play again" after time-out. Header: Help, Restart, Full screen (hidden where the Fullscreen API is unavailable, e.g. iPhone Safari; tries a landscape orientation lock after entering full screen). Help has a Close button.
- Walking: floating joystick. Touch anywhere on the map left of the minimap/plate column; the base appears under the finger and movement is analog (20% dead zone, full speed at the base radius). An idle dashed circle bottom-left reads "Drag to walk".
- Action button (bottom right of the map): SERVE at a counter (starts the 1-second ring, like E), EAT at home with food, dimmed otherwise. Its E keycap is hidden in touch mode.
- Plate popup: drag the food / tap the food as before, plus Place, Rotate, Auto and Cancel buttons stacked at the right edge of the arena (Cancel only while serving). On-canvas prompts drop keycaps ("Hold still or tap SERVE", "Tap EAT", "Tap to start").
- Added mobile web-app meta tags so "Add to Home Screen" can open without browser chrome on iOS (untested on a device).

Verified 2026-10-22: production build passed. Chromium mobile emulation (touch, coarse pointer) at 844x390 and 568x320, touch input only: Start, joystick to skewers, ring opens popup, Rotate, Place (only Cancel shown while serving), packed, SERVE button reopens via the ring, Cancel, joystick home, EAT banks 30, Help open/close, Restart, Full screen entered; no page errors. Desktop 1280x720: touch mode off, no visible buttons; keyboard regression tests still pass. Not verified on a physical phone.

## Full-plate bonus (2026-10-22)

- When a serve completes and all 12 plate cells are filled, every portion on the plate is flagged and scores ×1.25 when eaten (rounded per portion, e.g. skewers 30 → 38). The plate HUD shows ★×1.25 instead of free cells, its numbers show the boosted values, and the status line announces it. Portions keep the flag while you eat; food added after eating has started only gets it if the plate fills again. Constant: `FULL_BONUS` in `src/main.ts`.
- Why 1.25, from the current tuning: over all 21,524 ways to fill the 4×3 plate, a full plate is worth 84–168 (mean ≈ 123). Topping up the last cell usually means a berry detour (≈ 5.3 s round trip from home + 1.7 s ring/serve/eat ≈ 7 s), which at Gold pace (450 / 100 s = 4.5 pts/s) costs ≈ 31 pts minus the berry's 7 ≈ 25 net. ×1.25 adds ≈ +31 on an average plate (+21 to +42), so completing the plate is worth a detour with a small margin; ×1.5 (+62) would make full plates dominate. Combined with the faster serve/eat tune, medal goals likely need raising after playtesting.

## Food art on the plate (2026-10-22)

- Plate blocks (popup placed food, placement cursor, serving portion, and the plate HUD) draw the station's dish art fitted to the portion's footprint instead of a flat colour box: e.g. Royal roast fills its 2×2, Green skewers stand upright in 1×3 and lie flat when rotated to 3×1. Tall footprints rotate the art 90°. The point value (with any full-plate bonus) is a small corner badge. While serving, the art fades in as the portion fills.

## Mobile flicker fixes (2026-10-22)

- Cause 1 — joystick jitter: a resting thumb crossed the single 20% dead zone repeatedly, toggling movement and re-picking the facing every frame (front/back/side sprites swapped, ring reset). Fix: on/off hysteresis (start above 25% of the radius, stop below 12%), light smoothing of the finger offset (40 ms), and facing hysteresis (switch axis only when one axis is 20% stronger; near diagonals keep a matching facing). Measured with emulated jittery touch: facing changes 45–55 → 0–1, movement toggles 53–58 → 1 per ~8 s rest.
- Cause 2 — resize frames: when the mobile browser bar changed the viewport, the HUD column width (scale-dependent) shifted the camera ~20 units in one frame, and the resize callback ran after that frame's draw. Fix: the shell redraws right after fitting the canvas in the ResizeObserver callback, and the camera's usable width eases to its new value (max 3.3 units/frame in the same test).

## Chicken leg replaces Sushi pair (2026-10-23, revised)

- The grill room (formerly sushi bar, top right; sign "THE GRILL") serves a Chicken leg: thigh + drumstick in a 3-cell L (2×2 box). Score per cell kept at sushi's 14 → 42 pts; serve/eat scale per cell from sushi (×3/2): 1.275 s serve, 1.15 s eat.
- Art: one roasted leg quarter drawn across the whole L (thigh along one arm, drumstick and bone up the other), rotated with the piece's 4 orientations; the counter shows it on a platter with an L footprint icon.
- Plate logic supports any cell shape: footprints are cell lists, Rotate cycles all distinct orientations (1 square, 2 rectangle, 4 L), fit/auto-place/drag/full-plate checks are per cell.
- Numbers: 24 placements on an empty plate (sushi had 17) and it fits 95% of half-full plates, so it is not harder to place in raw terms; its cost is the awkward single-cell holes it tends to leave. It appears in 64% of the 7,329 full-plate packings. A dedicated trip is 12.3 s for 42 pts = 3.41 pts/s (old sushi 2.43; roast 4.63; skewers 4.57), and at 14 pts/cell it is the densest filler for a high-value full plate.
- Full plates average 118.5 pts (84–168); ×1.25 still adds ≈ +30, above the ≈ 25-pt net cost of a top-up detour, so FULL_BONUS is unchanged.
- (An earlier same-day version used a 5-cell 3×3 L worth 70; replaced at the user's request.)

## Start on any input (2026-10-24)

- Enter is no longer required: any key (except H, which opens Help, and modifier keys), any click or tap on the map, or the touch Start button starts the round / plays again. Input is ignored for the first second after the ready or end screen appears (`START_DELAY` in `src/main.ts`) so keys held at time-out don't instantly restart; the dialogue shows "Get ready…" during that second and the touch Start button is disabled.

## Feast: rhythm eating (2026-10-24)

- Eating is now a one-button rhythm mini-game (`src/feast.ts` logic, `drawFeast` in `src/art.ts`). E / Eat at home opens the Feast panel: the plate (current portion outlined) above a lane where notes slide into a mouth target. The chart is the plate in pickup order, one note per cell, one note every 0.4 s (BEAT), after a 0.8 s count-in. The "Eat" column in the food table above is superseded; eating time is now cells × 0.4 s.
- Patterns ('T' tap, 'H' hold one beat): Berry T · Rolls TT · Skewers TTT · Chicken leg TTH (thigh = hold) · Roast HHTT.
- Grades per bite: Perfect (±60 ms) ×1.2, Good (±120 ms) ×1.0, Miss ×0.6; releasing a hold more than 60 ms early drops one grade; stray presses are ignored. A portion banks value × average bite grade (× full-plate bonus) when its last bite is judged. No fail state.
- Input: keyboard E (down/up for holds); touch: tap / hold anywhere on the map. Esc or the touch Stop button ends early: finished portions are already banked, partly eaten portions keep their judged bites and resume on the next Feast. Movement is locked and the round clock keeps running.
- Tests: on-time keyboard play of skewers + roast scored Perfect ×7 = 94; no input = 3 misses, 18; on-beat touch taps = Perfect ×3; logic unit checks for hold early-release, window edges (130 ms late = miss), stray presses and resume.
- Balance: eating a full plate now takes 4.8 s + 0.8 s count-in (was ~3.7 s for 4 skewers), and score scales ×0.6–×1.2 with timing; medal goals need playtest retuning.

## Sound effects (2026-10-24)

- `src/sound.ts` plays one **recorded** munch (`src/sfx/munch.wav`, imported so Vite hashes it into `dist/assets`). Synthesised versions sounded industrial, not like a human bite, so they were replaced. Source: `crunch.4.ogg` from "7 Eating Crunches" by StarNinjas, CC0 (https://opengameart.org/node/123490), trimmed to 0.33 s, mono, normalised, WAV for browser compatibility. Each play varies pitch ±8% so repeats don't sound identical. The AudioContext is created and the clip fetched/decoded on the first key or pointer press (browser autoplay rules, iOS included).
- It plays on every successful Feast bite (Perfect or Good), for all foods. Nothing else makes sound (no ticks, miss, bank, popup, packed or time-out sounds) — reduced on playtest feedback that the fuller set did not work.
- Feast emits cues as an event queue (`Feast.events`); main plays the munch immediately after E / touch input, so it is not delayed to the next frame. Tests read `window.__sfxLog` (only exists when a test sets it).
- Mute: M (keyboard) or the touch header Sound button; stored in localStorage (`buffet-dash-muted`), wrapped in try/catch so private browsing still works.
