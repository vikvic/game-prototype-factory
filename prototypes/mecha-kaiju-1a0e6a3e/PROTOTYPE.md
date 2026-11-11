# Mecha vs Kaiju: Field Support

Landscape, turn-based grid tactics. Three mecha defend a city from kaiju waves; the player moves mecha and keeps them alive in the field by playing part cards (arms/weapons, legs, heads, repairs) from a deck. Single self-contained `index.html` (inline CSS/JS, emoji + inline SVG sprites, no external assets, no backend).

## Rules (current)
- 12x5 grid; the city (6 buildings) sits in the middle (columns 4-7) and mecha start inside it. Kaiju land on the red edge zones on both flanks (columns 0-1 and 10-11), alternating sides. Waves arrive on a timer (turns 1, 5, 10).
- Turn order: PLAN (move mecha, play cards; 3 energy, hand of 5) → MECHA FIRE (automatic: each weapon with ammo hits the nearest kaiju in range) → KAIJU MOVE → KAIJU ATTACK.
- Mecha parts: head (0 = 50% accuracy), two arms (weapons/shield), core (0 = mecha down), legs (0 = no movement). Hits on a destroyed part spill to the core.
- Every weapon has ammo; a spent weapon must be replaced with an arm card. Each shot flashes a vertical ammo gauge beside the mecha (left side = left arm, right = right arm; amber = last round). Running dry shows an OUT OF AMMO callout and a blinking L/R EMPTY tag on the mecha.
- Kaiju commit at the start of the plan phase and do not chase: Rex stomps a marked tile, Wyvern breathes fire along 2 tiles, Beetle charges in a fixed direction and hits the first mecha/building in the way. A mecha within 3 tiles draws their attack.
- Lose if every building falls or every mecha is down. Win by clearing all waves.

## Controls
Tap a mecha, tap a blue-dot tile to move (re-pickable from the turn's start tile). Drag a card onto a mecha (auto-picks destroyed → spent → most damaged slot) or onto a part row in the side panel; tap-card-then-tap-part also works. Tap a kaiju to see its intent and aim odds. ⏩ speeds animations, ↻ restarts, ? opens help. Portrait phones show a rotate prompt.

## Build
`npm ci` then `npm run build` produces relative-base static output in `dist/`. No TypeScript sources; the game script is inline in `index.html`.

## Playtest questions
Do intent previews (kaiju tiles + cyan weapon targeting) make card/positioning choices feel deliberate? Is ammo/part replacement fun or a chore? Balance is provisional: a headless bot that dodges marked tiles wins most games and games run long (~30+ turns), so difficulty and wave pacing need tuning.

## Verification
Headless bot runs (jsdom) completed full games without runtime errors; kaiju intent previews matched actual hits. Chromium screenshots at 844x390 and 1366x768 confirmed layout, drag-and-drop, range badges, phase banners and attack effects. No physical-phone verification.
