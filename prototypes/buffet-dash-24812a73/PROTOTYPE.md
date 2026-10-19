# Buffet Dash

A Canvas buffet game with a 100-second round. Fully eat portions at the home table to bank points. Bronze: 200; silver: 320; gold: 450. Timeout ends every run regardless of target.

## Controls
- Start begins the clock. Restart immediately starts a fresh run.
- WASD / arrows move. Click or tap the room to walk to a destination.
- Near a station, Serve selects its portion. Click a plate cell to place its top-left corner, or Auto-place for the first available fit. Rotate swaps width and height.
- Cancel / Escape abandons selection, serving, or eating. Moving cancels an unfinished serve without adding food.
- E / Eat at home consumes portions in pickup order. Movement stops eating. Partial eating progress is retained; press Eat at home to resume.

## Implemented mechanics
The visible 4×3 plate checks exact clicked cells for bounds and overlaps. Dashed outlines show suggested placement or pointer fit feedback. Invalid placements lose no food; the round clock continues. Serving reserves cells and adds food only after completion. Completed eating credits points and frees cells. Unfinished portions never score. Restart clears inventory, progress, destination, held keys, score, and timers.

| Food | Footprint | Value | Serve | Eat |
| --- | --- | --- | --- | --- |
| Berry bites | 1×1 | 7 | 0.7s | 1s |
| Golden rolls | 2×1 | 19 | 1.4s | 2s |
| Green skewers | 1×3 | 30 | 1.8s | 2.8s |
| Sushi pair | 2×1 | 28 | 1.7s | 2.3s |
| Royal roast | 2×2 | 48 | 3.5s | 5.2s |

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

Verified 2026-10-19: existing strict TypeScript / production build passed. Scratch Chromium and WebKit emulation covered all five declared viewport sizes with no button clipping/overlap, action-target failures, document overflow or uncaught page errors; screenshots were retained locally. Help/portrait pause was checked at the smallest size for the timed starters and Buffet. A real touch smoke at 568x320 covered Buffet rotation/manual packing/19 points banked/restart and Tunnel ore selection/confirmation/cursor correction/second nest/three turrets/wave-1 clear/restart. Full trusted touch-gameplay scenarios remain a subsequent verification gate. No physical-device verification is claimed here; human readability, comfort and balance remain playtest questions.
