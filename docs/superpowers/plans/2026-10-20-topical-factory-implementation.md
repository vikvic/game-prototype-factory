# Topical Factory Implementation Plan

> For agentic workers: execute inline with superpowers:executing-plans. The user authorized implementation; do not ask for the same approval again. User's no-new-tests instruction overrides generic TDD; use existing builds and authorized browser acceptance.

**Goal:** Deliver operational opportunity intake, a reusable paparazzi game, edition assembly and a commercial release path without touching historical prototypes.

**Architecture:** A topical subcommand owns a separate local SQLite database, immutable release folders and a separate static commercial output. It consumes structured researched opportunities and validated edition packages. Shared game source is pinned to a Git commit; public games contain no local orchestration or secrets.

**Tech Stack:** Python/SQLite, TypeScript Canvas/Vite, Playwright Chromium/WebKit, GitHub Actions/Cloudflare, disabled-by-default Plausible/H5 adapters.

**Spec:** ../specs/2026-10-20-topical-game-factory-design.md

## Global constraints

- Existing prototypes, queue.sqlite3, blog and unfinished feedback work stay intact.
- No share incentives, social gates, real ads in previews/verification, or paid services without a spending decision.
- New real-person/news hooks require editorial approval; no automatic posting or outreach.
- Single build worker, immutable snapshots, expiry checks, exact-artifact verification and truthful readiness status.
- Landscape matrix 568x320,667x375,844x390,667x280; portrait390x844; desktop1280x720.
- No generic unit suite. Run compilation/builds, actual CLI operations and trusted browser acceptance.

## Review focus

- Untrusted source URLs, XML and copy must not cause command execution, SSRF, path traversal or HTML/script injection.
- An expired opportunity, changed edition or different artifact must not reuse an earlier approval/check.
- Ads/analytics/sharing cancellation must not affect ordinary play; automated browsers never issue production ad calls.
- A failed or interrupted build must not corrupt another release or legacy factory state.
- Revenue unavailable or site-wide must not be represented as confirmed per-edition earnings.

## Task 1: State, configuration and CLI

Files: prototype_factory/topical/{cli,store,config}.py, factory.py; commercial.toml, profiles/commercial.md.
Interfaces: TopicalStore(root), release/opportunity CRUD; load(root) validated config; topical.cli.main(root,argv).
- [ ] Add topical dispatch before legacy queue/config creation.
- [ ] Add isolated topical.sqlite3, atomic transitions and meaningful events; configuration defaults disable paid integrations.
- [ ] Document boundary with unfinished feedback work and add readiness reporting.
- [ ] Verify compileall and execute init/list/readiness on an empty temporary root; legacy CLI help unchanged.

## Task 2: Research intake

Files: topical/{feeds,research}.py, research/sources.json, research/opportunities/*.md, research/pilot.json.
Interfaces: collect(root,store,config), import_research(store,path), require_current(store,id,review=False).
- [ ] Implement bounded public RSS fetching with redirect/address checks, size/time limits, caching and no executable interpretation.
- [ ] Validate opportunities, separate observations from claims, deduplicate and persist explicit expiry/status.
- [ ] Research ten actual candidates with primary evidence; record absent growth data honestly and concrete distribution targets.
- [ ] Exercise collection/import/select/expiry with real CLI commands; no raw feed item auto-builds.

## Task 3: Reusable game

Files: reusable_games/paparazzi-escape/{src,index.html,package*.json,tsconfig.json,PROTOTYPE.md}.
Interfaces: public edition.json; Canvas#game, #start,#restart,#help,#share,#save; readonly gameplay evidence attributes.
- [ ] Implement camera-cone evasion, dash, cover, escalating waves, win/loss, original vector figures and humorous results.
- [ ] Implement touch/keyboard controls, responsive landscape/portrait, pause, restart and share/save/copy fallbacks independent of progress.
- [ ] Add shared disabled/mock commercial services; production integrations remain gated by configuration and credentials/readiness.
- [ ] Strict TypeScript/build and real browser play acceptance including loss/win, touch, share cancel, mock no-fill and pause.

## Task 4: Edition queue, artifacts and site

Files: topical/{editions,delivery,site}.py, editions/*/edition.json, tools/check_topical.mjs.
Interfaces: build(root,store,edition_path), verify(root,store,release_id), approve(...), build_site(...).
- [ ] Validate edition fields; pin game Git source, snapshot full inputs; use lock + supervised npm processes and bounded restart-safe phases.
- [ ] Assemble three fictional preview editions tied to researched audiences, never imply those editions are measured trends/celebrity endorsements.
- [ ] Verify exact build fingerprints with trusted browser evidence; require current opportunity + fresh checks before approval/export.
- [ ] Produce standalone commercial gallery/legal/contact readiness, share previews, marketing package and manifest; keep dist legacy untouched.
- [ ] Add manual retirement and revenue/cost report import with unknown/estimated/final distinctions.

## Task 5: Delivery documentation and review

Files: .github/workflows/topical.yml, docs/topical-factory.md, README.md, .env.example.
- [ ] Add opt-in workflow_dispatch Cloudflare exact-artifact deploy; no parallel unverified production deploy; source SHA and manifest travel together.
- [ ] Document commands, profiles, public vs private identifiers, source limitations, operator decision points and no automation installed by default.
- [ ] Run existing production checks, topical CLI lifecycle and Chromium/WebKit acceptance. Record artifacts and limitations.
- [ ] Independent whole-branch review, fix important findings, scoped commits. Integrate only after verification; external accounts/domain remain explicit readiness dependencies.
