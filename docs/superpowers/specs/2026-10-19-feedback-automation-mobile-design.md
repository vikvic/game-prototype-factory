# Feedback-driven prototype iteration and mobile landscape

Date: 2026-10-19
Status: Proposed design; implementation has not started.
Repository: C:\Users\vic\Documents\GitHub\game-prototype-factory

## Intent and agreed requirements

The user plays a prototype, sends a list of design changes in this chat, and expects the system to implement those changes, diagnose and repair technical problems, commit and push the result, and deploy it through GitHub Actions. Examples include changing numbers, movement speed, and other design parameters. A second approval for every routine game revision is not part of the requested loop.

The user also reports that the previously delivered games are unusable on mobile. Mobile landscape must become a required acceptance target. Buffet Dash's plate and action controls currently live outside the visible gameplay area on a phone; both gameplay and the controls needed to complete a round must fit together.

This work extends the existing factory. Preserve its Markdown intake, SQLite job history, builder adapters, process supervision, local play links, exported games, and existing Git repository. Keep the blog repository separate.

## Current evidence

- New jobs copy a Canvas or Three.js starter. Retry creates a new attempt; it does not continue an exported game's current source.
- Each job has input snapshots and builder/build logs. Implementation evidence and the production build are checked, but browser gameplay and landscape layout are not worker-enforced gates.
- Source exports under prototypes/ are what the gallery and Pages workflow build. The existing export command refuses overwrites.
- The monitor is read-only. Discord is an outbound webhook, not an input interface.
- Both current games size their Canvas principally from width. Short landscape height is not budgeted for.
- Buffet Dash stacks its control/plate panel under the map below an 850-pixel width breakpoint. Tunnel Frontier similarly stacks its build panel below the map below 800 pixels. Desktop-oriented titles, statistics, instructions, and spacing further consume height.
- Buffet Dash already has pointer-based movement, but movement alone does not make the complete game usable by touch.
- The Pages workflow builds all exported games and deploys on a matching main-branch push. The separate Checks workflow is not currently a dependency of Pages deployment.
- Git inspection for this design found main clean and aligned with origin/main at 9674ffb. This is an observation, not a future precondition to assume without checking again.

## Recommended approach and alternatives

Extend the factory with a real iteration job and a trusted verification/deployment coordinator. Use the present chat as the first feedback interface and persist its requests as Markdown. This gives the user the requested experience without first building an account system or a writable public dashboard.

Two alternatives remain possible: manually operate each game as its own coding project, or build a full hosted product with feedback accounts and remote workers. The first does not provide the requested unattended loop; the second adds infrastructure unrelated to proving the loop. Individual game repositories remain a later promotion option, not part of this first implementation.

## User-visible loop

1. The user names a game and sends free-form feedback in chat, including exact requested values where relevant.
2. The assistant saves the feedback as a local Markdown request, names its target game and current source revision, and queues an iteration. Once accepted, the running worker can finish it without further chat turns.
3. The worker copies that exact version into an isolated attempt, applies the feedback using the configured Codex or Claude adapter, and records changed files and a concise explanation.
4. The coordinator builds it, launches it locally, checks browser errors and landscape layout, and exercises the game's specified core interactions using touch.
5. On a concrete failure, the worker supplies the error, failed step, and evidence to a fresh repair invocation against the same candidate. It repeats the failed checks and any affected checks.
6. After all required checks pass, the coordinator commits only this iteration's intended changes and pushes them to the configured factory repository/main branch. Actions verifies and deploys the gallery.
7. The coordinator follows that deployment and checks the actual live game path and version. The user receives the resulting URL, changes, checks performed, and any remaining limitations. Discord receives an outbound result when configured.

The host must be awake and the worker running for unattended work. A normal ChatGPT conversation does not itself write files to this machine; the connected assistant performs intake, then the local worker owns execution. No Discord bot, public intake API, or additional inbound service is included.

## Identity, source, and history

- Separate a stable game identity from a build attempt. Preserve existing public identifiers and URLs, including buffet-dash-24812a73 and tunnel-frontier-e2df699d.
- The committed export under prototypes/<existing-game-id>/ is the canonical deployed source. Iterations update that same path through a new Git commit; ordinary tweaks do not produce a duplicate gallery card.
- Intake pins the base Git commit plus the allowlisted game-source fingerprint. Snapshot feedback, preferences, configuration, parent attempt/version, and source for each new attempt.
- Keep private feedback, prompts, raw logs, screenshots, and repair evidence under ignored .factory/ state. Commit concise implementation/verification notes without copying private feedback verbatim into public assets.
- Previous attempt folders and local play URLs remain available. Git retains deployed source history. Public hosting of every historical version is outside this increment.
- If local uncommitted edits affect the target source, stop intake for that game with an actionable explanation; do not overwrite or silently omit them. Preserve unrelated edits.
- A feedback request receives a persistent identifier. Re-ingesting the identical request does not launch or publish a second iteration. New requests for the same game run serially; do not silently cancel earlier requested changes.
- If an explicitly pinned parent is superseded before execution, record needs_input rather than silently changing its meaning. Chat intake normally selects the latest accepted version.
- Changes to numeric tuning should be localized in a small per-game tuning module where practical. Do not build a general gameplay framework or migrate either game's engine as part of this work.

## Queue, execution, and observability

- Add iteration metadata through a backward-compatible SQLite migration, preserving existing jobs/events/outbox. Make a recoverable database backup before migration.
- Keep one active worker and existing process-tree ownership. All builder invocations, repairs, browser processes, and temporary servers have timeouts and cleanup.
- Use existing saved builder authentication; no hardcoded credentials or global CLI configuration changes. Preserve the working Windows sandbox configuration.
- Builder write access covers the candidate game's source and report, not factory checks, Git publishing credentials, the main checkout, or workflow configuration.
- Factory verification and publishing run outside the builder process. Builder output is evidence to inspect, not authority to skip gates or execute arbitrary commands.
- Persist stages separately: queued, implementing, verifying, repairing, ready_to_publish, committing, pushed, deploying, deployed, failed, needs_input, or interrupted. Existing generation statuses remain compatible; add fields/events rather than repurposing a ready result as a deployed result.
- Each browser/repair round gets its own logs, screenshots, and machine-readable result. Expose a readable summary and local evidence links in the monitor; raw private prompts remain private.
- Assistant's proposed default: one initial builder attempt plus at most two repairs per feedback request, within one shared 30-minute active build/repair budget. Deployment waits have a separate finite timeout and cannot restart the model budget. Existing provider-specific monetary/turn limits still apply where supported; do not invent a Codex dollar cap.
- Exhausted repairs produce failed with a concise failure report. An interrupted or failed job is never reported as deployed.
- Resume execution from recorded checkpoints after a restart; reconcile existing local commit, remote SHA, workflow run, and deployment before redoing side effects. Never duplicate a commit/push because a notification failed.

## Mobile landscape acceptance contract

Mobile landscape is required for both existing games and new builds using the maintained templates. Desktop keyboard/mouse operation remains required. Portrait may show a useful rotate-to-landscape message; complete portrait gameplay is outside this increment.

Assistant's proposed minimum matrix, expressed as CSS viewport sizes:

- Touch landscape: 568x320, 667x375, and 844x390.
- Short-height variation: 667x280 to exercise reduced visible browser space.
- Desktop: 1280x720.
- Rotation/resizing: enter landscape from portrait during a round and resize again without losing game state or breaking pointer coordinates.

The active game, essential status, and actions needed to play must fit within the available visible viewport. There must be no page scrolling to alternate between movement and actions, no clipped controls, and no overlapping interactive elements. Instructions, decorative headings, legends, and secondary information may move into a Help overlay or compact expandable panel. Preserve browser zoom; fullscreen and orientation lock are optional enhancements, never prerequisites.

Use a shared layout contract in the templates, including dynamic available height, safe-area insets, a compact HUD, a bounded gameplay region, and accessible touch actions. Preserve the Canvas/camera's aspect ratio and correct input mapping when letterboxing; do not stretch the map to fill remaining space. Handle high-DPI rendering and resizing without resetting a round. Scope gesture suppression to the game surface so ordinary browser interaction remains usable.

Essential action buttons should have approximately 44x44 CSS-pixel touch targets. Dense board/plate cells may use a different interaction design, but their touch flow must be demonstrated as usable; shrinking the entire interface until it fits is not acceptable. Required actions cannot depend on hover, a hardware keyboard, right-click, or precise mouse placement. Any Help overlay must pause gameplay consistently and close accessibly.

### Buffet Dash retrofit

- Landscape presents the room and a compact plate/action area together inside one viewport.
- Keep timer, banked score, carried value, current action/progress, and essential feedback readable.
- Support tap-to-move, proximity-based serving, manual plate placement, rotation, auto-place, cancel, returning home, eating, and restart entirely by touch.
- Expose only currently relevant primary actions where useful, while keeping the rest reachable without leaving the game view.
- Put longer rules and keyboard instructions behind Help.
- Resolve focus/scroll behavior, cancel input on lost focus where appropriate, and keep pointer coordinates correct after rotation.
- Do not change existing food values, movement speed, scoring, timing, or goals merely to implement the layout.

### Tunnel Frontier retrofit

- Landscape keeps the map, compact HUD, and Dig/Turret/Repair/Start wave/Restart actions together.
- Tile inspection, resource costs, placement feedback, and range information must be available without hover.
- Provide a clear touch selection/confirmation interaction where direct small-tile tapping would be error prone. Preserve efficient desktop operation.
- Verify digging, ore income, opening a nest, placing a turret, combat/wave progression, and restart by touch.
- Preserve the current economy, wave rules, and combat values during the layout retrofit.

### Templates and future games

- Update both Canvas and Three.js starters plus generation/iteration preferences to include the same viewport and touch requirements.
- Rendering in 3D does not remove the need for an explicit touch interaction and reachable controls.
- Existing unmodified starter-demo exports and other unexported jobs are not implicitly certified by this retrofit. Label verification coverage accurately.

## Automatic diagnosis and verification

Introduce a factory-owned browser verification tool using a pinned Playwright development dependency, with Chromium and WebKit coverage. This is an explicitly requested runtime verification feature, not an unrelated unit-test suite. Do not add general unit tests or mirror implementation details.

Before publication, require:

1. Valid expected source changes, updated implementation notes, strict TypeScript check, and production build.
2. Local launch under the same gallery subpath used by Pages, so asset-path failures surface before push.
3. No uncaught browser exceptions, failed required game assets, or missing game surface. Record console messages with enough context for diagnosis; do not suppress errors to pass.
4. Visible and unobstructed essential controls, no body overflow during active landscape gameplay, correct Canvas bounds, and adequate action targets at the declared sizes.
5. Actual touch interactions through the core loop. For Buffet Dash, pick up and pack food, return, eat, observe a positive banked-score change, and restart. For Tunnel Frontier, dig/mine, build, activate a nest, start combat, observe progression, and restart. Exercise rotation and contextual UI as well.
6. Desktop keyboard/pointer regression checks and final screenshots of initial, active, and result/restart states where applicable.

Keep game-specific acceptance scenarios and their expected invariants in factory-owned tooling outside the candidate builder's writable folder. A builder cannot make its result pass by weakening those scenarios. Feedback changing an expected rule must update the trusted scenario deliberately during intake/implementation review and record the reason, never through a repair that deletes the failing assertion.

New games get generic browser/layout gates plus a game-specific acceptance scenario describing their core loop. Generic page-load success alone must not be described as gameplay verification. If a core-loop scenario cannot be established automatically, mark that coverage as missing and stop automatic publication with needs_input rather than pretending the game was checked.

Repair inputs include the requested changes, source diff, failing phase, relevant logs, screenshot paths, and exact failed invariant. Builders repair the candidate, then the coordinator reruns the affected checks and the final required gate. Preserve an audit trail of all rounds.

Chromium/WebKit touch emulation is automated evidence, not evidence of physical iPhone/Android testing. Report actual-device coverage separately. The user will supply real-device feedback when available; do not claim real mobile Safari/Chrome verification from desktop emulation.

## Git, CI, deployment, and failure handling

- The configured destination is the existing factory repository and main branch. The factory gallery remains a project site under /game-prototype-factory/; do not alter the blog repository or root user site.
- Assistant's recommendation is to enable automatic commit/push for iteration jobs in this repository, matching the user's stated policy. Keep it an explicit setting rather than silently changing behavior for every installation or historical demo/generation job.
- Use an isolated Git checkout/worktree based on the recorded remote revision. Stage only the candidate game's intended allowlisted files and its concise public notes. Preserve unrelated local edits and commits.
- Before committing, inspect the entire changed/staged path list, inspect the diff, and check whitespace. An iteration cannot modify workflow files, factory orchestration, unrelated games, dependencies, or secrets through ordinary feedback.
- Use a normal fast-forward push; never force-push, reset the user's checkout, or push unrelated local commits.
- If the remote moves, reconcile against its new base and rerun the required affected/full-gallery gates. A change to the target game since the pinned parent requires explicit conflict resolution; do not silently discard either version.
- Make required factory checks and browser/game verification dependencies of Pages deployment, rather than relying on a separate workflow's success. Include the current process-cleanup verification in required factory checks.
- Before push, build the complete exported gallery so an unrelated pre-existing build failure is reported as such, not repaired by silently editing another game.
- Publish a small static deployment manifest containing the built source commit and game versions. Follow the Actions run for the pushed commit and inspect the actual Pages URL and assets with cache bypass/retry.
- Record pushed, workflow_succeeded, and live_verified independently. Only a matching live manifest and successful live smoke check produce deployed and a success notification.
- CI build/deploy failures feed the same bounded repair policy when attributable to the current revision. Authentication, quota, unavailable hosting, and unrelated repository failures stop with an actionable status instead of repeated model calls.
- If a failed build never deployed, retain the previously live version. If the new version deployed but live checks fail, attempt one scoped rollback commit restoring the previous known-good game source only when no newer target-game revision has superseded it. Verify the rollback deployment and report both failure and recovery. No history rewriting; do not loop rollbacks.
- Notifications use the existing persistent outbox. Notification failure does not rerun implementation, create a second commit, or claim a deployment failure.
- Credentials remain in existing CLI authentication and Actions secrets. Ask only if a required login or permission is actually missing.

## Delivery order

1. Retrofit and manually inspect both current games in landscape, then encode their touch/core-loop acceptance scenarios. This establishes concrete examples for the reusable contract.
2. Update Canvas and Three.js templates and generation preferences to prevent the same layout failure in new prototypes.
3. Add pinned-parent iteration intake, immutable attempts, migration, and local comparison/reporting.
4. Add trusted browser verification, bounded repair, and visible stage/evidence reporting.
5. Add scoped automated commits/pushes, required CI gates, deployment reconciliation, live checks, and failure recovery.
6. Exercise an end-to-end feedback revision against an existing game, including a deliberately induced recoverable failure, then document everyday usage and setup.

Keep coherent implementation changes reviewable in separate commits. The eventual implementation is authorized to commit and push completed, verified changes to this factory repository. This proposed-design document is prepared for review before product implementation.

## Completion evidence

- Both current games complete their specified touch flows within the declared landscape viewports without leaving the gameplay view to find essential controls.
- Desktop operation still works, and changing orientation preserves game state/input mapping.
- A feedback request changes the existing version instead of regenerating a starter, while preserving requested values and unaffected behavior.
- A real failing build/browser step produces an automatic repair and recorded recheck; an unrepairable request stops after the stated bound.
- One successful request results in a scoped Git commit, normal push, successful required CI gates, matching live version, verified game link, and notification where configured.
- A resumed job reconciles commit/deploy state without publishing twice, and a failed release has a known recovery outcome.
- Earlier attempts remain available locally, Git history is intact, SQLite history is preserved, and unrelated work remains untouched.

## Explicitly deferred

- A public writable dashboard, mobile companion app, inbound Discord bot, account system, or cloud-hosted model worker.
- Autonomous assessment of whether a game is fun or balanced. The user retains that decision.
- Promotion into independent game repositories, campaigns, progression, new assets, monetization, multiplayer, or engine replacement.
- A claim that all physical mobile devices, every old job, or every old starter-demo export has been verified.

## Technical references checked during design

- https://playwright.dev/docs/emulation — viewport, device scale, mobile behavior, and touch emulation.
- https://playwright.dev/docs/ci-intro — browser checks in GitHub Actions with retained reports.

Remaining builder choices: exact internal class/module names, SQLite field layout, compact landscape styling, and reusable browser-driver structure, provided all invariants and acceptance requirements above are preserved.
