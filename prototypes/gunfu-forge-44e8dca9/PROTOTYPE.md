# Gunfu Forge — brawler revision (2026-10-20)

## Request

Replace projectile shooting with close-range brawling. Use abstract icons for punches and kicks, make enemies stagger, and momentarily lock the player in place while attacking. Keep the existing round-to-round ability composition, game identity, URL and landscape controls.

## Current fighting loop

- WASD / arrows or the movement pad moves. Space / J / Punch chains three punches. R / K / Kick commits to a heavier, longer-reaching strike. Tap or hold either action. Attacks face the nearest standing opponent, but only connect inside their local hit arc.
- Gold vector fist and violet vector boot silhouettes show the action. Short attack cones, impact stars, enemy flinch/slide, knockdown silhouettes, a planted-feet underline, damage flash and restrained shake communicate state. No projectiles or ammunition remain, including enemy attacks.
- Punch has startup, an active hit window and recovery totaling 0.32 seconds; the third punch totals 0.38 seconds and knocks down. Kick totals 0.54 seconds. Movement input is retained but cannot move the player until recovery ends. A short input buffer helps link attacks.
- Hits interrupt enemy windups and apply hitstun. Kick pushes farther; finishers and Sweep knock enemies down. Getting up includes a brief protected interval. The player also staggers when hit and has a short hurt-immunity window. No contact damage.
- Pink grunts and purple bruisers approach and use telegraphed melee attacks. At most two opponents can wind up attacks together; soft crowd separation keeps silhouettes readable.
- Four finite rounds, three permanent fusion choices, win/loss, restart and Help remain. First rewards are Lunge + Punch, Punch + Backstep and Step-in + Kick. Later choices include Double Punch, Sweep Kick, Slam Kick and Guard Punch. Backstep happens after a connected attack and waits for Double's follow-up when both are selected, preserving both parts of the move.

## Design changes and rationale

| Previous | Revision | Why |
| --- | --- | --- |
| Shoot + Reload, six-round magazine | Punch + Kick, chain indicator | Both actions now contribute to close combat; ammunition would interrupt this experiment. |
| Mobile shooting while freely moving | Brief 0.32–0.54 s attack commitment | Position before swinging; retain responsive free movement between strikes. |
| Ranged bullets | Punch reach 76 / Kick reach 112 world units, local cones | Kicks make space, punches reward getting close; neither attacks across the room. |
| No enemy hitstun | Punch 0.32 s / Kick 0.58 s stagger | Hits interrupt attacks and create an opening for the next action. |
| No knockdown | Finisher/Sweep 0.9 s down,0.35 s get-up protection | Add crowd control without indefinite ground trapping. |
| Projectile impact flashes | Fist/boot icons and 40–65 ms hitstop | Make individual blows readable and give them weight. |
| Six player health | Eight health, still+2 between rounds | Close-range commitment needs room to learn the new enemy timing. |
| Waves 6/8/10/12 | Waves 4/5/6/7, max 4 active | Account for melee approach/recovery time while keeping a short complete run. |

Additional tuning: player speed 205; punch damage 1, finisher/kick 2; grunts 3 health then 4 in rounds 3/4, bruisers 5. Grunt windup 0.48 s, bruiser 0.72 s; player hurt immunity 0.95 s and stagger 0.25 s. Lunge 42, Step-in 64 and Backstep 40 world units. Double adds one close-range follow-up hit, Sweep widens the kick, Slam catches nearby foes only on a connected kick, Guard protects the first 0.14 s of punch startup.

## Assumptions and next playtest

This retains the existing top-down arena and procedural geometric visuals. The focus is attack weight, positioning and composable moves. Grapples, throws, air combat, audio and persistent progression are outside this pass. Holding an action repeats attacks; deliberately release it to reposition. A chain counts linked swings, including whiffs, rather than a damage-only combo score.

Evaluate whether Punch feels responsive while still committing, whether Kick has enough impact to justify its longer recovery, whether enemy stagger is legible on a phone, and whether Lunge/Backstep change your positioning decisions. Confidence in intended mechanics: high; final balance and physical-device ergonomics require human playtesting.

## Verification

On 2026-10-20 the strict production build passed, all 9 Chromium/WebKit acceptance cases passed, the desktop route won four rounds, and the alternate Backstep + Double route registered a connected follow-up and disengagement. Native two-finger Chromium emulation verified both attack locks, movement recovery and cancellation. Review approved the fusion-order and telegraph fixes. Live release evidence is recorded separately after deployment; these checks do not establish physical-device ergonomics or human gameplay quality.

Release evidence is kept locally under `.factory/brawler-*`. The existing strict TypeScript/Vite production build and factory-owned Chromium/WebKit browser workflow are used. The gate covers first-wave melee/finisher/upgrade/restart at all target sizes, keyboard attack commitment/recovery, a complete desktop campaign, and an alternate Backstep + Double route that must land its follow-up before disengaging. A separate native two-finger Chromium probe checks held movement against both attacks, recovery and cancellation. Enemy telegraph rendering and damage use the same angular constant. Observable Canvas data fields report actual punches/kicks/hits/staggers/knockdowns/follow-ups, attack lock, current style and player position; they do not control gameplay. No mutable gameplay hooks or general unit suite were added.

Selectors: `#game`, `#punch`, `#kick`, `#combo`, `#health`, `#wave`, `#style`, `#move-pad`, `#start`, `#restart`, `#help`, `#help-dialog`, `#help-close` and `button.upgrade`. Landscape targets remain 568×320,667×375,844×390,667×280 and desktop 1280×720. Help, portrait, tab hiding and blur pause the same run and clear held inputs. Physical devices are not verified by desktop emulation.
