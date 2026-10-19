# Trusted runtime browser gate

Setup from the factory root: `npm ci --ignore-scripts`, then `npm run browsers:install`.
Linux CI can use `npx playwright install --with-deps chromium webkit` instead.
Playwright is pinned to 1.64.1 in the root lockfile. Game dependencies remain separate.

Build the candidate with its existing strict production command before this browser stage.

- Project: `node tools/playcheck.mjs --project prototypes/buffet-dash-24812a73 --game buffet-dash-24812a73 --output .factory/checks/buffet`
- Template: `node tools/playcheck.mjs --project templates/canvas --game canvas-starter --output .factory/checks/canvas`
- Gallery: `node tools/playcheck.mjs --site dist --output .factory/checks/gallery`
- Actual game URL: `node tools/playcheck.mjs --url https://vikvic.github.io/game-prototype-factory/games/buffet-dash-24812a73/ --game buffet-dash-24812a73 --output .factory/checks/live`

Project mode serves `dist` at `/game-prototype-factory/games/ID/`; gallery mode mounts
its built site at `/game-prototype-factory/`. Requests cannot escape the selected
root, including through linked files. Missing assets, failed requests, console
errors and uncaught page errors fail the gate. All console output is retained in
result diagnostics. No candidate scripts or scenarios are imported into Node.

The Python `verify_game(project, game_id, evidence, timeout)` wrapper always uses
this factory's Node entry, even when the candidate belongs to another temporary
factory/store root. It uses existing process-tree supervision and binds success
to an unchanged `project_fingerprint` of allowlisted source/config/report files
and an unchanged `build_fingerprint` of the served production artifacts.
The coordinator must build this same source immediately before verification.
Linked source paths are rejected before descending (including Windows junctions).
Source fingerprints sort case-preserved relative POSIX names and normalize UTF-8
web source/config/report text from CRLF or CR to LF. Binary assets remain byte-exact.
The local build-artifact fingerprint intentionally hashes exact served bytes. Unknown games raise `MissingCoverage` and
cannot be published automatically. Gallery mode skips only explicit demo=true
metadata; direct project checks still require a trusted scenario.

Each known game runs its full registered core loop at 568x320, 667x375, 844x390,
667x280 in Chromium and WebKit touch emulation, plus 1280x720 desktop Chromium.
Checks include all visible main controls (disabled included), 44px primary
buttons, bounds/overlap/hit testing, essential status, body overflow against the
requested viewport, Canvas aspect/backing-buffer bounds, native touch, real
score/economy outcomes, and restart. Dense plate cells use manual placement plus
Auto-place instead of the 44px button rule. First touch case in each engine also
checks modal Help and portrait pause, preserved round state, short-height resize
and real input after restoring landscape. Tunnel repeats pause/rotation during
an active wave after observing a real enemy-count decrease, preserving remaining
enemies, health, credits and phase. Cosmetic animations may continue while paused. Desktop scenarios check actual keyboard
outcomes and pointer interaction. Screenshots and phase evidence are retained.

The four trusted IDs are buffet-dash-24812a73, tunnel-frontier-e2df699d,
canvas-starter and three-starter. Update the factory-owned scenario deliberately
if geometry or core rules change; never weaken assertions in a candidate repair.
Invariants tolerate numeric tuning (income increases, costs decrease funds,
positive carried/banked score, live core, progression), rather than freezing old
point values. Tunnel covers one completed combat wave, not all four campaign
waves. Starters cover collection and restart, not a guaranteed twelve-pickup win.
This is desktop emulation, not physical Android/iPhone or mobile Safari coverage;
it does not establish comfort, readability on actual hardware, balance or fun.

Single-game CLI has a 285-second default deadline, gallery 1200 seconds; use
`--timeout SECONDS` to override. Python imposes the caller's process timeout
(default 300 seconds) and kills/cleans its browser/server descendants on failure.
The Node deadline closes owned browsers and server; normal paths do likewise.
The wrapper writes a failed result with the evidence path even on timeout.
