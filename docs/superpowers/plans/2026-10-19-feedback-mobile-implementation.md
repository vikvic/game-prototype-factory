# Feedback Iteration and Mobile Landscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two existing games usable in mobile landscape and deliver feedback against existing versions through bounded verification/repair, scoped Git pushes, and verified Pages deployments.

**Architecture:** Preserve the existing Python/SQLite factory and CLI builder adapters. Add a trusted browser verifier and explicit iteration metadata, with Git publishing controlled by the coordinator rather than generated game code. Keep stable exported game paths and immutable attempt folders.

**Tech Stack:** Python 3.11+ standard library; Node 24; TypeScript/Vite Canvas and Three.js; pinned Playwright development tooling; Git/GitHub CLI and existing Actions Pages.

**Spec:** docs/superpowers/specs/2026-10-19-feedback-automation-mobile-design.md

## Global Constraints

- Preserve existing files, existing job history, stable game IDs/URLs, and the blog repository.
- Mobile landscape viewports: 568x320, 667x375, 844x390; short-height variation: 667x280; desktop: 1280x720.
- Required game surface, HUD, and controls fit simultaneously, without page scrolling or overlap; essential buttons approximately 44x44 CSS pixels; no keyboard/hover requirement for touch.
- Keep gameplay values unchanged during mobile retrofit; later tuning follows player intent and preserves explicitly fixed values, with old/new values and rationale reported.
- One initial implementation plus at most two repairs; one shared 1800-second active implementation/verification budget. Browser/deployment subprocesses are bounded and cleaned up.
- No general unit-test suite. The user explicitly requested automatic debugging/browser verification: implement and execute those runtime checks, plus existing appropriate verification commands.
- Preserve Codex's working Windows sandbox configuration and saved CLI authentication. Never hardcode secrets, weaken permissions, force-push, reset user changes, or publish unrelated files/commits.
- User authorized implementation, coherent commits, normal pushes to the existing factory repository, and deployment. Do not ask for approval again for those actions.
- Product implementation happens in the isolated factory-implementation worktree. No sources/ edits. No worker subagents or worker-created reviewers.

## Review Focus

- Tiny landscape heights, browser-space changes, and portrait-to-landscape transitions must preserve reachable actions and state.
- Feedback duplicates and queued requests based on superseded source must never silently lose requested changes.
- Interrupted publishing must reconcile recorded commits and deployments without duplicating pushes or reporting success early.
- Dirty/unrelated files, changed remotes, and concurrent updates to the target game must not be overwritten or included in an automatic commit.
- Browser tooling must not allow generated source to weaken acceptance or arbitrary feedback to execute shell commands; missing gameplay coverage blocks automatic publication.

## Task 1: Landscape layouts, touch flows, and template contract

**Ownership:** prototypes/buffet-dash-24812a73/{index.html,src/*,PROTOTYPE.md}, prototypes/tunnel-frontier-e2df699d/{index.html,src/*,PROTOTYPE.md}, templates/{canvas,three}/{index.html,src/*,PROTOTYPE.md}; preferences.md.

**Interfaces:** Preserve existing IDs and controls. Add stable semantic attributes where useful to inspect game state from actual UI; do not implement fake verification-only gameplay or expose mutation cheats. Trusted scenarios will use real touch actions and actual DOM results. Both prototypes retain their 100-second/four-wave rules and existing tuning.

- [ ] Read current Canvas/input/layout implementations and reproduce overflow geometrically at the required heights.
- [ ] Implement height-aware game layouts with safe areas, compact HUDs, co-visible controls, bounded aspect-preserving map regions, and non-scrolling active landscape mode.
- [ ] Put secondary instructions in a Help overlay that pauses consistently; keep portrait rotate guidance and desktop accessibility.
- [ ] Buffet: preserve tap-to-move; expose plate packing, rotation, auto-place, Serve/Eat/Cancel and Restart together. Tunnel: provide visible touch tile selection/confirmation without hover dependence.
- [ ] Update both template shells and preferences with the landscape/touch contract, preserving dependencies, scripts, and Vite relative base.
- [ ] Run each of four existing production builds; record results, known limitations, and changed paths. Commit only owned files with a ui: subject.

## Task 2: Trusted automatic browser verification

**Ownership:** root package.json/package-lock.json; tools/playcheck.mjs; tools/playchecks/*; prototype_factory/verification.py; .gitignore only if needed for verifier artifacts. Do not modify game source without reporting a concrete blocker to the controller.

**Interfaces:** `verify_game(project: Path, game_id: str, evidence: Path, timeout: int) -> dict` performs full required checks and raises `ValueError` with evidence on failure. Node entry supports `--project PATH --game ID --output PATH`, `--site PATH --output PATH`, or `--url GAME_URL --game ID --output PATH`. Successful result.json has passed=true, game, scenario, matrix, screenshots, and explicitly emulated=true; failed results have passed=false and concrete failure details. Node exits nonzero on any missing mandatory coverage. Known registry IDs: buffet-dash-24812a73, tunnel-frontier-e2df699d; template IDs canvas-starter and three-starter. Unknown non-demo games require a trusted factory-owned scenario; report missing coverage clearly.

- [ ] Pin the current official Playwright release in a root-only development dependency/lockfile; install Chromium/WebKit through documented setup.
- [ ] Implement a local static server under /game-prototype-factory/games/ID/ with traversal protection, bounded lifetime, and strict error/asset reporting.
- [ ] Implement generic layout, actionable control, touch-target, asset, console, Canvas/input and resize checks across the required matrix, desktop Chromium and mobile Chromium/WebKit.
- [ ] Implement real per-game touch scenarios: Buffet pickup/packing/rotation/home/eat/positive score/restart; Tunnel dig/ore/turret/nest/combat/progression/restart; both starters movement/collection/restart. Keep invariants tolerant of legitimate numeric tuning.
- [ ] Capture screenshots and machine-readable phase evidence on success/failure. Do not treat emulation as physical-device coverage.
- [ ] Run the verifier against both built games and both templates. Exercise a deliberate missing-asset/overflow failure without committing broken source. Commit only owned tooling.

## Task 3: Persistent feedback intake and bounded iteration/repair

**Ownership:** prototype_factory/{store.py,config.py,cli.py,runner.py,intake.py}; new prototype_factory/iteration.py; factory.toml; tools/verify.py only compatibility adjustments needed for existing fixture behavior. No edits to publishing or browser internals owned by other tasks.

**Interfaces:** CLI `feedback GAME_ID FILE [--id REQUEST_ID] [--base SHA]` snapshots feedback into ignored .factory state and queues a version-preserving job; `feedback-inbox` ingests .factory/inbox/*.md with front matter game/id/base. `run --watch` watches both idea and feedback intake. `build_iteration(store, job, demo=False)` uses existing builder adapters, immutable source snapshots, trusted `verify_game`, and updates job state. `resume JOB_ID` resumes interrupted/failed iteration checkpoints without regenerating the original template. New job fields include kind (generation default), game_id, base_sha, feedback_id, and details (JSON durable checkpoints); migrate schema 1 to 2 with backup. Keep existing ready/failed generation compatibility. Iteration phase records distinguish implementation/verification/repair/publishing/deployment.

- [ ] Add recoverable additive SQLite migration and persistent deduplication; keep prior data, snapshots, queue order, and events. Same-game requests execute serially; stale explicitly pinned parents become needs_input.
- [ ] Validate game IDs and committed canonical source, reject target dirty edits and symlinks, pin commit/fingerprint, and copy only allowlisted source. Never mutate an earlier attempt.
- [ ] Add explicit iteration settings max_repairs=2, timeout_seconds=1800, browser_timeout_seconds=300. Unknown config keys/types remain rejected. Publish settings in Task 4 may add deploy keys.
- [ ] Build an iteration prompt preserving working features and locked values while allowing documented design judgment on suggested values; require old/new/rationale/next-playtest question in PROTOTYPE.md.
- [ ] Run implementation/build/browser checks; send concrete failure evidence into fresh repair invocations, with separate logs and a shared timeout. Missing trusted gameplay coverage becomes needs_input. Gate publication on final success; no weakening trusted checks.
- [ ] Enforce browser/layout checks for new non-demo generation too; no known scenario means explicit needs_input rather than unchecked ready. Keep tools/verify.py fake generation fixtures explicitly offline/verification-disabled where needed without disabling real defaults.
- [ ] Exercise offline temporary-repository intake, migration, dedupe, stale-parent and interrupted scenarios through actual entry points; use existing builder mocking only for bounded non-model verification. Run existing tools/verify.py --quick and compileall. Commit only owned files.

## Task 4: Scoped publishing, deployment reconciliation, and monitor

**Ownership:** new prototype_factory/delivery.py; prototype_factory/{export.py,dashboard.py,notifications.py}; tools/build_site.py; config.py/cli.py/runner.py only publishing integration; factory.toml; .github/workflows/{checks,pages}.yml.

**Interfaces:** `deliver_iteration(store, job) -> None` consumes a ready iteration and durable details checkpoint, publishes from a Git worktree pinned to its recorded base, and updates deployment stages. `reconcile_iteration(store, job) -> None` resumes commit/push/deploy/live verification without repeating completed side effects. Deploy config adds auto_push=false by default, branch='main', timeout_seconds=900, rollback=true. This repository's factory.toml explicitly opts in with repository='vikvic/game-prototype-factory', pages_url='https://vikvic.github.io/game-prototype-factory/', auto_push=true. Only iterations auto-publish; historical generation/demo semantics unchanged. build_site adds deployment.json containing source_sha and version/fingerprints while preserving existing manifest.json array compatibility.

- [ ] Implement safe remote identity and fast-forward checks, isolated checkout, full-gallery build, exact-path staged diff inspection, whitespace check, coherent commit and normal push. Never include unrelated local commits or dirty source. Reconcile remote movement; target conflicts stop actionably.
- [ ] Persist SHA before push and workflow ID before waiting; idempotently resume crashed stages and distinguish pushed, workflow success, and live verified.
- [ ] Require current factory/process checks, templates, and browser checks before Pages deployment. Upload retained verification evidence. No model credentials in Actions.
- [ ] Verify actual deployment manifest/SHA and game assets, then run bounded live game smoke checks and record final URL. Retries account for propagation; do not confuse an old successful run with this iteration.
- [ ] Feed attributable CI failures through remaining bounded repair policy. Missing auth/quota/unavailable service/unrelated failures stop clearly. If a broken new game is live, perform at most one scoped rollback commit to the prior known-good source, only absent a newer target revision, and verify recovery.
- [ ] Add readable iteration stages, parent/commit links and local evidence links to read-only monitor, with existing traversal protections and no raw private prompts. Notification failure cannot rerun publishing.
- [ ] Verify against temporary bare Git remotes/fixture workflow responses without public side effects; then run Python syntax, existing quick verification, full gallery builds, and trusted browser gates. Commit only owned changes.

## Task 5: End-to-end operation, documentation, final review and deployment

**Ownership:** README.md; docs/{feedback-workflow.md,verification.md}; relevant PROTOTYPE.md verification notes; implementation integration fixes as identified by review. No unrelated edits.

- [ ] Document one-time browser setup, host/worker requirements, chat-to-Markdown intake, feedback example, stages/logs, limits, provider auth, standalone promotion deferral, and emulation/device distinction.
- [ ] Run the existing full local smoke verification and four builds, plus mobile/desktop gameplay matrix and deliberate repair/stop cases. Record actual evidence with dates and limitations.
- [ ] Dispatch a fresh whole-branch reviewer; address important findings and record verification. Do not add general tests contrary to user preference.
- [ ] Commit scoped implementation and docs. Safely fast-forward the user's clean main checkout to the completed branch if still appropriate; preserve any newly arrived changes. Normal push is explicitly authorized.
- [ ] Follow real Checks/Pages runs, diagnose and fix attributable failures, and verify actual live URLs and deployment.json source SHA.
- [ ] Run a real small feedback iteration against an existing game, using a reversible non-balance change to PROTOTYPE.md plus an innocuous visible/source improvement as appropriate, to prove the selected builder, checks, push, deployment and notification policy end-to-end. Do not invent an unrequested balance change. Deliberate repair failure is exercised locally before any public push.
- [ ] Leave the existing local worker/monitor configuration usable, report exact shipped behavior and any remaining external blockers, and retain required evidence.
