---
id: tunnel-frontier
title: Tunnel Frontier
template: canvas
priority: 0
enabled: true
---

# Tunnel Frontier — digging maze tower defense

Implement an actual playable, polished small 2D Canvas game, not a design document or modified starter. Focus on a two-minute loop: dig ore to fund defenses, but excavating toward ore can connect enemy nests to the core. The same tunnels you dig become the enemies' routes and your defense territory.

## Core playtest

- Top-down grid with a central core, excavated floor, dirt, ore pockets, and dormant enemy nests. Use a readable fixed map with a deliberately useful initial corridor and one initially connected nest, plus several optional nests near valuable ore. Show enough nest hints and ore to make excavation an informed risk.
- Planning alternates with four short escalating waves. In planning, the player selects Dig or Turret and clicks tiles. Dig only dirt/ore cardinal-adjacent to the tunnel network connected to the core. Ore grants credits; plain dirt does not. No digging anywhere on the map, diagonal shortcuts, or disconnected excavation.
- A nest activates permanently as soon as a carved route reaches it. Clearly flash the new front and update the next wave enemy count. All connected nests contribute to every remaining wave. There must always be at least one reachable enemy source; waiting without digging must not win empty waves.
- Start Wave launches enemies from all connected nests. Enemies follow the carved maze toward the core using grid pathfinding. Long winding routes buy shooting time. Do not let the player seal a path or exploit turret placement to make enemies unreachable: turrets can share tunnel tiles, do not block movement, and cannot be placed on core/nests. Make that rule visible.
- One turret type is sufficient: automatic range-limited shooting at enemies, costs credits, visible range preview and shot effects. Place turrets only on dug ground. Digging/building happens between waves, preventing accidental click-through and simplifying path rules. A modest affordable repair action between waves is useful, but avoid upgrade trees or complicated economies.
- Start with enough resources to place a useful defense. Ore must be valuable enough to motivate expansion; optional nests must create a noticeable tradeoff. Balance so completing four waves is achievable and losing the core is possible. Wave spawning, inter-wave transitions, victory and defeat must all work without reload.
- Clear UI: stage, core health, credits, active nests, next-wave enemy count, build costs, selected tool, hovered tile feedback, Start Wave and Restart. Include concise controls and a one-line goal. Use real HTML buttons for obvious actions and a readable responsive Canvas for the map. Mouse/touch clicks plus keyboard tool shortcuts. Restart fully resets all state.

## Presentation and boundaries

Use procedural geometric art with distinct earth, ore, tunnel, nest, turret and enemy silhouettes. Add a small legend and clear contrast. No images/assets/services/dependencies beyond the starter. Keep enemies and effects bounded; use a stable simulation and coordinate mapping on resize. Do not build menus, accounts, technology trees or a campaign.

Replace PROTOTYPE.md with controls, implemented mechanics, assumptions, limitations, and this evaluation question: "Does digging for ore feel tempting even when it exposes another enemy route?" Run the existing production build. Do not add automated tests. Report any actual verification limitations honestly.
