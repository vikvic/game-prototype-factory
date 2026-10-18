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
Values and medal goals are initial tuning choices. Roast has high portion value but lower points per cell and slower processing than distant sushi. Nearby berries fill gaps quickly. Movement is 190 map units/second. Serving range is 102 units; home range is 78. Furniture is decorative and traversable to avoid pathfinding traps. The clock continues when the tab is hidden; elapsed time is reconciled on the next frame.

## Evaluation question
Do plate packing and the return-to-table eating cost create interesting choices under time pressure?

## Known limitations and verification
No obstacles, NPCs, sound, persistence, discard, or manual rearrangement. Map labels scale down on narrow screens. Plate placement uses HTML buttons alongside the Canvas room. Balance and goals need human playtesting. Existing npm scripts, dependency versions, strict TypeScript configuration, and relative Vite base are preserved.

Verified on 2026-10-18: the factory's strict TypeScript/Vite production build passed. A manual browser check covered explicit start, click-to-walk, station-gated timed serving, manual placement, bounds/overlap rejection, rotation, auto-placement, returning home, eating to bank points, timeout with uneaten food, and restart. The observed round ended with 7 banked and 38 uneaten. The browser reported no warning/error logs during the check. No automated tests were added or run. Balance, medal targets, touch layouts, and complete keyboard/device coverage remain unverified.
