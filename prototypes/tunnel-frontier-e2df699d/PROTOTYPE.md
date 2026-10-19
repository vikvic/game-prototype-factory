# Tunnel Frontier

A small, fixed-map Canvas defense game built around funding defenses by excavating dangerous territory.

## Controls
- Click/tap Dig or press 1 / D, then select earth or ore beside the core-connected tunnel network.
- Click/tap Turret or press 2 / T, then select an empty excavated floor tile. The hover circle previews range.
- Start Wave button or N launches the next wave. Construction and digging are locked during combat.
- Repair restores up to 30 core integrity for 25 credits between waves.
- Restart button or R resets the entire run immediately, including map, economy, nests, enemies, and effects.
- Keyboard alternative: focus the map with Tab or a click, move the tile cursor with arrow keys, and act with Enter or Space. Native buttons also support keyboard activation.

## Implemented mechanics
- 19 × 13 fixed grid; central core; bent initial tunnel and one permanently connected nest. Three dormant nests and all ore are visible to support informed excavation.
- Cardinal flood fill restricts excavation to the connected network. Reaching a nest activates it permanently, flashes its location, announces the front, and increases the next wave count.
- Four waves of 5, 7, 9, and 12 enemies per active nest. Every connected nest contributes to every wave. Breadth-first distances produce shortest carved routes to the core.
- Nonblocking turrets cost 45 credits, have 3.1-tile range, and fire 14-damage shots every 0.48 seconds. No placement on core, nests, dirt, ore, or occupied turret tiles.
- Start with 100 credits and 100 core integrity. Ore yields 30; dirt yields nothing. The first three wave completions award 25 credits. Each arriving enemy deals 10 core damage.
- Enemies gain health and speed each wave. Core destruction loses; clearing wave four wins. Both end states support immediate restart.
- Fixed-step simulation at 60 Hz with capped catch-up, hidden-tab pause, bounded wave population, expiring shot/pulse effects, and responsive logical-coordinate pointer mapping.

## Assumptions
- Approximately two minutes includes player-paced planning; there is no planning timer. Waves run automatically until all spawned enemies are resolved.
- Excavating beside a dormant nest connects it automatically; nests themselves cannot be dug or built upon.
- Enemies use the shortest connected route. Digging shortcuts may reduce shooting time even without opening another nest.
- Ore can be mined without waking every nest. Deliberately conservative play is allowed; expansion is an optional source of more defense funding and risk.
- Repairs consume the same credits as turrets. No selling, upgrades, moving turrets, or sealing tunnels.

## Core evaluation question
"Does digging for ore feel tempting even when it exposes another enemy route?"

Observe whether players compare the extra ore against the visible next-wave increase, and whether they preserve long routes or accidentally shorten their defensive corridor.

## Known limitations and verification
- One handcrafted map and one turret/enemy type; no audio, save system, campaign, or procedural levels.
- Touch acts immediately on the tapped tile; detailed hover and range previews are most useful with mouse or keyboard.
- Canvas has keyboard controls and adjacent text feedback but does not provide a complete nonvisual representation of the map.
- Balance is an initial numeric tuning, not a claim of completed playtesting.
- No automated tests added or run. The factory's strict TypeScript/Vite production build passed on 2026-10-18. A browser playcheck then exposed a first-click tile offset: focusing the tall Canvas scrolled the page before reading pointer coordinates. Map focus now prevents scrolling; the rebuild and same-click browser recheck passed.
- Manual browser checks covered turret costs and placement, rejecting distant excavation, ore income, activating the eastern nest (1 to 2 active nests and 5 to 10 wave-one enemies), enemies following both tunnels, turret combat, construction lock during waves, supply rewards, subsequent wave counts, four-wave victory, and restart. The observed run stopped 66 enemies with 100% core integrity and reset to the original map, 100 credits, one nest, and five wave-one enemies. Browser warning/error logs were empty during the check.
- Repairs, defeat, the other optional nests, all keyboard paths, and touch/device layouts were not exhaustively playchecked. The completed run establishes a workable strategy, not balanced difficulty or replay value.

## Landscape and touch shell (2026-10-19)

The height-bounded layout targets 568x320, 667x375, 844x390, 667x280 and desktop 1280x720 CSS pixels. The HUD, map and essential actions stay in one landscape viewport; instructions are in Help. The actual Canvas box is fitted to the available region at its original aspect ratio, and pointer input uses that box after resizing. High-DPI rendering is retained. Portrait guidance pauses the same round until landscape returns; Help uses a native modal dialog, pauses simulation, clears held movement and resumes without resetting state. Browser zoom remains available.

Shared controls: #help opens #help-dialog; #help-close closes it. Escape closes the dialog through native browser behavior. #restart starts a fresh run. No gameplay tuning, dependency versions, scripts or relative Vite base changed. This retrofit does not certify older exported starter copies.

Touch: select #dig or #turret, tap #game once to inspect a tile without acting, adjust the persistent selection using #tile-left / #tile-up / #tile-down / #tile-right, then #confirm. The selected tile outline, one-based coordinates and #hover describe costs, range, current tile and nest risk. #confirm only enables for a valid action; after acting the tile remains selected for inspection. Arrow targets are at least 44x44 even when individual map tiles are smaller. Mouse click still acts directly; map-focused keyboard arrows/Enter still work. #repair and #start remain alongside the selection controls and #restart remains in the HUD. Rules/economy/combat and all four waves are unchanged.

Verified 2026-10-19: existing strict TypeScript / production build passed. Scratch Chromium and WebKit emulation covered all five declared viewport sizes with no button clipping/overlap, action-target failures, document overflow or uncaught page errors; screenshots were retained locally. Help/portrait pause was checked at the smallest size for the timed starters and Buffet. A real touch smoke at 568x320 covered Buffet rotation/manual packing/19 points banked/restart and Tunnel ore selection/confirmation/cursor correction/second nest/three turrets/wave-1 clear/restart. Full trusted touch-gameplay scenarios remain a subsequent verification gate. No physical-device verification is claimed here; human readability, comfort and balance remain playtest questions.
