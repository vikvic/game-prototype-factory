---
id: buffet-dash
title: Buffet Dash
template: canvas
priority: 0
enabled: true
---

# Buffet Dash — plate-packing time management

Implement an actual playable small 2D Canvas game, not a design document or modified starter. Control a diner moving among buffet stations, cram a limited plate with valuable foods, and return to the table to eat them before the round ends. Points are credited only when a portion is fully eaten at the table.

## Core playtest

- A readable compact top-down dining room, a clearly marked home table and four or five distinct food stations at different travel distances. WASD/arrows move the character; clicking/tapping open floor also sets a walk destination. Avoid complicated collision or pathfinding; place furniture so stations and table are accessible. Movement must stop/clear when a round ends or restarts.
- A 100-second round with a visible timer, score, current plate value and table goal. A simple bronze/silver/gold target makes comparison possible; the player can finish at timeout regardless of target. Start only on an explicit Start button or first deliberate interaction so a player has time to read.
- Give foods distinct values, rectangular plate footprints, serving durations and eating durations. Example balance: cheap fast 1x1 bites, 2x1 medium-value rolls, bulky 2x2 high-value premium portions. Display each station's numbers and role. These are tunable assumptions, not prescribed exact values. Station proximity gates serving: no remote pickups.
- Make "cramming food onto a plate" a real mechanic: visible 4x3 grid; when near a station choose a portion and place its footprint on the grid, with a rotate control for nonsquare items. Provide an obvious suggested placement/auto-place option so the first turn is understandable. Reject out-of-bounds/overlap placements without losing resources. Grid clicks must target the actual chosen cell and show fit feedback. Each serving costs its stated time and adds the portion only on completion. Allow canceling a pending portion/placement so no interaction traps the player. A simple discard action is acceptable.
- Returning to the home table is mandatory to bank points. Press E or a visible Eat button near the table to eat the plate sequentially with progress. Each completed portion credits its value and frees its occupied cells. Eating stops if you move away; unfinished food never scores at timeout. Use consistent pause/resume or restart semantics for a partial bite and explain them.
- Travel, serving and eating all consume the same round clock. A full plate can hold a useful run, but serving only bulky premium foods should not automatically dominate: fitting small bites into gaps and route choices should matter. Include at least one clear nearby low-value option and a farther premium option.
- Always visible: controls, station interaction prompt, plate space and value, timer, score, any pending serving/eating progress. Use real HTML buttons for Start/Serve/Rotate/Auto-place/Eat/Restart and a responsive map. A short first-run hint explains collect, fit, return, eat. End-of-round summary shows scored value and uneaten value; Restart resets timers, movement, inventory, progress, input state and score.

## Presentation and boundaries

Readable colorful geometric food icons and station colors, with labels and a clear player/table marker. No external art, network, accounts or added libraries. Avoid restaurant queues, NPC diners, cooking, upgrades, hunger/health systems or menus. Keep interaction modes simple and ensure keyboard movement does not scroll the page.

Replace PROTOTYPE.md with controls, implemented mechanics, assumptions, limitations, and this evaluation question: "Do plate packing and the return-to-table eating cost create interesting choices under time pressure?" Run the existing production build. Do not add automated tests. Report actual verification limitations honestly.
