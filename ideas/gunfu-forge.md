---
id: gunfu-forge
title: Gunfu Forge
template: canvas
priority: 20
enabled: true
---
# Gunfu Forge — build a fighting style

Create a complete playable 2D top-down arena gunfu prototype. The user's central idea is that attacks are upgraded between rounds by appending abilities: a normal stationary shot becomes a backdash plus shot, and later a backdash plus spread or piercing shot. The result must change positioning, timing and fighting style, not merely increase damage. This is a new prototype; do not depend on existing Gunfu games.

## Small complete loop

- Four short combat rounds, three upgrade intermissions, clear victory/defeat and restart. Target a 2–3 minute run. Start at a readable ready screen with a Start button and concise explanation of the experiment.
- Two primary action slots: Shoot and Reload. Shoot initially fires toward the nearest enemy without forcing movement; use limited ammunition, visible magazine and a short repeat cooldown. Reload initially refills after a brief vulnerable windup. Free movement is always available during combat.
- Each intermission offers three genuinely different upgrades, with a target slot and a plain-language before → after preview. First intermission must offer Backdash + Shoot, Sidestep + Shoot, and Dash + Reload so movement fusion can be evaluated immediately. Later rewards may append piercing rounds, a fan volley, reload shockwave, or a brief guard to compatible slots.
- Upgrade effects persist, compose and are visible in the action labels/current-style readout. Selecting a second effect must retain the first effect, not replace it. At least one normal route must produce a three-part action, e.g. Backdash + Fan + Shoot. Avoid duplicate upgrades and impossible or contradictory movement stacks. Ensure three valid offers remain available. Limit scope rather than add an inventory or complex menu.
- Implement appended behaviors as real composable action modifiers with an explicit order. Move direction is relative to the aim/nearest enemy: backdash retreats; sidestep moves laterally; reload dash follows movement input or retreats if stationary. Clamp all dashes inside arena bounds. If a modifier grants a dodge/guard window, telegraph it and keep it short; do not make the player permanently invincible.
- Enemies: telegraphed melee rushers and a small number of ranged enemies with dodgeable projectiles. Predictable first round, modest escalation, fair health recovery between rounds. No contact-hit spam; use a visible hurt cooldown. Do not spawn enemies directly on the player. Use finite enemies per wave so combat can actually end.
- Show meaningful action feedback: bullet traces, dash trail, muzzle flash, enemy hit/death, recoil, telegraphed attacks, short combo/style feedback. Distinct silhouettes/colors and restrained screen shake. Neon training-dojo aesthetic, polished procedural geometric art. No downloaded assets, accounts, audio autoplay, extra dependencies or network calls.

## Desktop and touch

- Desktop WASD/arrows move, Space or J shoots, R or K reloads; optional pointer aim is allowed but nearest-enemy aim must make the whole game playable with touch.
- Touch: a generous left-side virtual movement pad plus separate right-side Shoot and Reload buttons. A real tap fires; holding Shoot repeats at the same cooldown. Movement and actions must work simultaneously with separate pointer IDs. Clear input on cancel, blur, pause and orientation changes. No controls relying only on hover, right-click or keyboard.
- Fit arena, health/ammo/wave, essential controls and current action identities simultaneously at landscape 568x320, 667x375, 844x390, 667x280 and desktop1280x720. No body scroll, overlap, clipped controls or 44px hit-target shrinkage. Keep text concise; upgrade cards must fit landscape and clearly expose effects.
- Keep accessible Help and Restart visible. Help and portrait guidance pause all simulation, timers and held input. Resizing preserves the same run. Help is a native accessible dialog with Close. Pause while tab is hidden. Preserve sharp rendering/aspect ratio and map pointer input to actual Canvas bounds.

## Observable UI contract for real play verification

Use canvas#game, #start, #shoot, #reload, #restart, #help, #help-close, dialog#help-dialog, #health, #ammo, #wave, #style, #status, #move-pad, #upgrades and three button.upgrade cards. Publish read-only observable data attributes on canvas#game: data-phase (ready/playing/upgrade/won/lost), data-round, data-kills, data-shots, data-reloads, data-dashes, data-modifiers (comma-separated chosen IDs), data-player-x and data-player-y. They reflect real state; do not add cheats, test shortcuts, global mutable state or verification code. Upgrade buttons need data-modifier, data-slot and explicit visible text, and remain operable with keyboard/touch.

## Delivery

Use the existing TypeScript Canvas starter and pinned toolchain; keep npm scripts and Vite base unchanged. Replace its unrelated collection game entirely. No test files. The orchestrator owns installation and production build. Write PROTOTYPE.md with the hypothesis, all controls, move composition rules, numeric tuning/rationale, assumptions, known limitations, and what the user should evaluate after playing. Do not claim browser/device verification you have not performed.
