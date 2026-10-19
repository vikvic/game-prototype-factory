# Signal Garden — untouched Canvas starter

This is a playable template, not an implementation of an ingested idea.

Collect twelve golden signals in forty-five seconds. A coral drone follows you
and speeds up with every pickup. Move with WASD/arrows or hold and drag on the
arena. Restart with R or the Restart button.

Evaluate route planning versus increasing chase pressure. Keyboard and pointer
input, score, win/loss, resize, and restart are included. No external assets,
audio, saves, or backend. Human playtesting is still required.

## Landscape and touch shell (2026-10-19)

The height-bounded layout targets 568x320, 667x375, 844x390, 667x280 and desktop 1280x720 CSS pixels. The HUD, map and essential actions stay in one landscape viewport; instructions are in Help. The actual Canvas box is fitted to the available region at its original aspect ratio, and pointer input uses that box after resizing. High-DPI rendering is retained. Portrait guidance pauses the same round until landscape returns; Help uses a native modal dialog, pauses simulation, clears held movement and resumes without resetting state. Browser zoom remains available.

Shared controls: #help opens #help-dialog; #help-close closes it. Escape closes the dialog through native browser behavior. #restart starts a fresh run. No gameplay tuning, dependency versions, scripts or relative Vite base changed. This retrofit does not certify older exported starter copies.

Touch: hold and drag on #game to move toward the held point; release/cancel stops the destination. Score #score and timer #time stay visible, #status reports outcomes, and #restart resets the run. The Three.js floor raycast and Canvas coordinates use the same fitted Canvas bounds. The starters retain their existing 45-second / twelve-pickup rules.

Verified 2026-10-19: existing strict TypeScript / production build passed. Scratch Chromium and WebKit emulation covered all five declared viewport sizes with no button clipping/overlap, action-target failures, document overflow or uncaught page errors; screenshots were retained locally. Help/portrait pause was checked at the smallest size for the timed starters and Buffet. A real touch smoke at 568x320 covered Buffet rotation/manual packing/19 points banked/restart and Tunnel ore selection/confirmation/cursor correction/second nest/three turrets/wave-1 clear/restart. Full trusted touch-gameplay scenarios remain a subsequent verification gate. No physical-device verification is claimed here; human readability, comfort and balance remain playtest questions.
