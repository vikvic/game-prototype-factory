# Prototype preferences

- Optimize for testing one core mechanic within two minutes.
- Make reasonable assumptions. Record them in PROTOTYPE.md instead of blocking.
- Default to plain TypeScript Canvas for 2D. Use Three.js only for a 3D idea.
- Make controls visible. Require keyboard/mouse and complete touch gameplay in mobile landscape.
- Include a clear goal, score or progress, loss/win condition, and restart.
- Use geometric shapes and procedural visuals; no external assets or accounts.
- Keep the initial scope small. Avoid menus, progression systems, and backends.
- No analytics, monetization, external network calls, or additional dependencies.
- Request clarification in QUESTION.md only if a playable interpretation is impossible.
- Do not add automated tests. Run the existing typecheck and production build.
- Explain what to evaluate, controls, known limitations, and assumptions in PROTOTYPE.md.

## Required landscape and touch contract

- Fit the active game, compact HUD and all essential actions together without body scrolling or interactive overlap at CSS viewports 568x320, 667x375, 844x390, 667x280, and desktop 1280x720.
- Budget height first with dynamic viewport units and safe-area insets. Preserve Canvas/camera aspect ratio in a bounded region; map pointer coordinates to the actual letterboxed Canvas bounds. Resize/orientation changes preserve round state and rendering stays sharp on high-DPI screens.
- Use approximately 44x44 CSS-pixel action targets. Dense board cells need a usable explicit selection/confirmation or packing flow. Do not shrink the whole UI, depend on hover/right-click/keyboard, or require fullscreen/orientation lock. Preserve browser zoom and scope gesture suppression to the game surface.
- Put long instructions in an accessible Help dialog. Pause the game while Help is open or portrait rotate guidance is shown, resume the same round on close/rotation, and clear held movement input. Keep a visible Restart and meaningful status/feedback.
- Document the actual touch loop, selectors and any coverage limits in PROTOTYPE.md. The existing production build establishes compilation; trusted Chromium/WebKit emulation checks establish browser evidence. Claim physical-device verification only when actually performed.
