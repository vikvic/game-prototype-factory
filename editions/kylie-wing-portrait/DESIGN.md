# Portrait design and reasoning

Approved chat proposal: a manual upward course, player in the lower third, clear next obstacle, separate bottom controls, compact HUD/status, and a separate public comparison link.

## Presentation

The optional `layout: portrait-course` turns the existing x-progress/z-lateral world into a portrait-only overhead corridor at every viewport size. Up advances; screen right moves across the corridor. The same character, doors, equipment, crew and car remain. Door walls show their actual solid footprints. A blue clearance footprint appears near doors/props before contact. Coral contact feedback and a green route arrow explain a snag. Hold Tuck with the other thumb to fit a lit gap.

The HUD, Canvas, status strip and controls occupy separate rows, including at 320x568. Movement stays on the left, Tuck on the right. Intro/results use portrait layouts and actions at least 44 CSS pixels. The browser retains zoom and safe-area padding.

## Challenge stays constant

No automatic movement or steering. Keep 60 seconds, three doors, five snags, existing 174/106 open/folded speeds, collider dimensions, flash windows and recoil. `wing-world.ts` is unchanged. Looking farther ahead and showing clearance improve comprehension rather than changing those values.

## Rotation and verification

Wide windows center the same portrait frame between empty side bars. The horizontal renderer and orientation-selected controls have been removed. Turning the window/phone clears all held input and pauses for Continue; x/z, time, milestones and damage stay in the same world. Help and background events still pause.

The existing trusted acceptance is adapted for 320x568, 360x640, 390x844, 430x932, 667x375, 923x884 and desktop in Chromium, plus the first five in WebKit. It exercises genuine keyboard/pointer inputs, Chromium multi-touch, canceled touch, snags, all three doors, win/loss, retry, sharing cancellation/fallback, save image, failed optional ad fill, Help and rotation. Desktop engine emulation does not establish physical-phone thumb comfort or browser-chrome/safe-area behavior; check those on an iPhone and Android before making this the default.

The first release is a separate Pages test snapshot with ads/analytics disabled. It does not replace the original test link or approve a commercial launch.

October 21 correction: keep one portrait experience, including landscape browser windows. Side bars are empty; ads remain disabled. In short windows the same controls compact, and results reclaim the control row for readable actions. Physics and challenge values are unchanged.
