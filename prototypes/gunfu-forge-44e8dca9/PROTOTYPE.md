# Gunfu Forge

## Hypothesis and playtest
Appending movement and payload behaviors to familiar actions changes spacing and timing enough to create a recognizable fighting style. The core question: after choosing Backdash, do you deliberately fire to retreat and then line enemies up for Fan or Pierce, instead of simply holding fire?

Play four finite waves. Compare Backdash, Sidestep, and Reload Dash starts. Evaluate whether each changes positioning, whether nearest-target aim is predictable, and whether retaining movement while adding a payload feels like composition. Target duration is roughly two minutes including three choices; this is an estimate, not measured play evidence.

## Controls and touch loop
- WASD / arrows: move. Space / J: shoot (hold repeats). R / K: reload.
- Mouse or touch: drag the left pad; tap or hold Shoot; tap Reload. Movement and Shoot use separate captured pointer IDs, so two fingers work together. Reload is a native button activated on release.
- Aim always targets the nearest live enemy; no pointer aiming is required.
- Start begins training. Visible Restart immediately resets to round one. Help opens a native dialog; Close or Escape resumes.
- Help, portrait guidance, hidden tabs, and window blur pause simulation and timers. Pause, pointer cancel, blur, and orientation changes clear held input. Resizing preserves state.

## Composition
Each action processes selected modifiers in explicit numeric order: movement (0), protection (1), payload (2/3), then base action. Reload Pulse is deferred until refill completes.

First offers: Backdash + Shoot, Sidestep + Shoot, Dash + Reload. Later offers come from remaining compatible effects, prioritizing Fan, Pierce, Pulse, Guard, and missing movement. Shoot's two movement options are mutually exclusive. No duplicates; the seven-effect pool leaves at least three valid offers at every intermission. Choices persist. A common route is Backdash → Fan → Pierce.

Backdash retreats 66 world units from initial aim. Sidestep moves 60 units to the left of aim. Reload Dash moves 108 units with movement input, otherwise away from aim. Dashes clamp to the arena. The intended enemy is selected before the dash; shot direction is then calculated from the new position to that same target. Base Shoot is stationary, with visual gun recoil.

## Tuning and rationale
- Fixed 960 × 480 arena; player moves 205 units/second. Rendering preserves aspect ratio and uses displayed dimensions for high-DPI backing resolution.
- Six health, six ammunition, 0.32-second shot cooldown. Each bullet deals one damage. Fan emits three bullets at ±0.22 radians for one ammo; Pierce retains bullets through enemies.
- Reload: 0.9 seconds, with free movement and no shooting. Guard covers only its first 0.3 seconds. Dash dodge lasts 0.12 seconds, shorter than the firing cooldown.
- Pulse: one damage and 80-unit push within 145 units on refill.
- One-second visible hurt immunity prevents hit spam. Contact alone does not damage. Damage causes a restrained three-world-unit shake for 0.17 seconds.
- Waves contain 6, 8, 10, 12 opponents; at most five active. Spawn intervals are 2 seconds in round one and 1.6 seconds later. Spawn points are at least 285 units from the player.
- Melee enemies have two health, rising to three in rounds three/four. Speed is 58–76 units/second. A 0.55-second locked warning precedes a 110-unit lunge; recovery is 1.25 seconds.
- Ranged enemies begin in round two, approximately one per four spawns, with two health. Their 0.7-second warning locks direction before firing a 235-unit/second bolt; recovery is 1.8 seconds.
- Each cleared wave restores up to two health; every new wave refills ammo. Finite opponents, no round timer, victory after wave four.

## UI and observability
Required selectors are present: `canvas#game`, `#start`, `#shoot`, `#reload`, `#restart`, `#help`, `#help-close`, `dialog#help-dialog`, `#health`, `#ammo`, `#wave`, `#style`, `#status`, `#move-pad`, `#upgrades`, and three `button.upgrade` cards. Cards publish `data-modifier` and `data-slot`, with visible before → after text.

Canvas attributes expose actual phase, round, cumulative kills/shots/reloads/dashes, chosen modifier IDs, and player coordinates. These are observational outputs only; gameplay never reads them. No global mutable API or verification shortcuts.

Layout budgets a 44px header, compact style/status strips, and the remaining arena height. Touch controls occupy dedicated side columns, with a 96px minimum movement pad and buttons at least 44px. Ready/upgrade/end panels replace combat controls. At short heights, cards use compact text across three columns. The canvas is letterboxed without stretching. Pointer movement uses actual pad bounds; canvas pointer aiming is intentionally absent.

## Assumptions and limitations
- Entirely procedural visuals, no audio, external assets, requests, persistence, or dependencies added.
- A dash is an instantaneous displacement with a fading trail, not a physics sweep; enemy lunges use swept collision against the player.
- Enemy geometry may overlap. Fan can hit one close enemy with multiple projectiles. These are deliberate small-scope mechanics to evaluate.
- Movement fusion may meet arena boundaries; choosing firing position is part of the experiment.
- Auto-aim can switch as enemies cross; manual target locking is outside scope.
- Keyboard and touch operate the same actions; upgrades support native keyboard focus. Combat itself is visual and is not screen-reader playable.
- Portrait guidance requires landscape. Help remains accessible during landscape play.
- Production TypeScript/Vite build passed. Trusted browser checks passed Chromium and WebKit at 568×320, 667×375, 844×390 and 667×280, plus Chromium desktop 1280×720. Checks played real first-wave combat, selected Backdash, fired the combined move, checked upgrade layout, pause/orientation preservation and restart. A desktop route won all four waves with Backdash + Fan + Pierce + Shoot (36 kills); native Chromium two-finger emulation verified movement + held shooting, cancellation and reload. The mobile HUD font was enlarged after the initial readability check. Evidence is local under .factory/gunfu-verification/ and .factory/gunfu-multitouch/. No physical-device claim.
- Human difficulty, fun, touch ergonomics and run duration still need playtesting. The automated Backdash/Fan/Pierce route can win without sustained manual movement, so this first pass is deliberately forgiving; evaluate whether enemy pressure should discourage corner camping. Confidence in build and observed composition behavior: high; confidence in final balance and physical-device ergonomics: moderate.
