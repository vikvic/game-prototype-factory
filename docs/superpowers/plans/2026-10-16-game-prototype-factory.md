# Game Prototype Factory Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. The user explicitly requested implementation; proceed without another approval round.

**Goal:** Markdown idea in, persistent build job out, inspectable game folder and deployable gallery.

**Architecture:** Python standard-library CLI owns an immutable SQLite job queue, supervised Claude processes, read-only dashboard, and notification outbox. Independent Vite templates produce static games. Explicit source export feeds a GitHub Pages workflow.

**Tech Stack:** Python 3.11+, SQLite, Node 22.12+, npm, TypeScript, Vite, Three.js.

**Spec:** `docs/superpowers/specs/2026-10-16-game-prototype-factory-design.md`

## Global Constraints

- Preserve all existing files and read-only synced sources.
- No hardcoded secrets, permission bypass, implicit push, or deployment success claims.
- Single worker, fresh job folders, snapshot inputs, bounded jobs, persistent history.
- Basic verification requested; no additional testing framework or large test suite.

## Review Focus

- Concurrent starts and crash recovery must not execute one claim twice.
- Malformed or duplicate idea IDs must fail before partially ingesting a batch.
- Timeouts and interrupts must stop child processes and preserve failure evidence.
- Export/deploy must exclude local secrets and private intake/log files.
- Notifications and links must distinguish local completion from confirmed live deployment.

### Task 1: Intake and queue

- [x] Create `factory.py`, `prototype_factory/config.py`, `intake.py`, `store.py`, `locking.py`, editable preferences/config, and sample ideas.
- [x] Provide CLI init/status/show/events/ingest/retry/cancel/recover with atomic queue claims and revision deduplication.
- [x] Verify intake idempotence, revision behavior, lock exclusion, cancellation and retries in a temporary directory.

### Task 2: Templates and supervised jobs

- [x] Create `templates/canvas` and `templates/three` with locked dependencies, controls, scoring, restart and resize handling.
- [x] Implement `runner.py`: immutable snapshots, isolated Git roots, dependency installation, bounded Claude invocation, result parsing, questions, build validation, process-tree cleanup.
- [x] Run both template production builds and a demo job, then exercise the runner with a fake local Claude executable.

### Task 3: Monitoring and notifications

- [x] Add read-only dashboard/API, local preview, persistent event outbox, and Discord delivery with bounded retry and secret-safe errors.
- [x] Verify HTTP status/preview and notification payloads locally without sending messages externally.

### Task 4: Export and delivery

- [x] Add source export, static gallery builder, GitHub Actions checks and Pages deployment, CI Discord notification and deployment reconciliation.
- [x] Write setup and operations documentation with exact PowerShell commands, credentials deferred until each integration is enabled.
- [x] Build the gallery, inspect game UI, review the final diff, copy the complete repository into the chosen Documents folder without overwriting unrelated files, then rerun basic verification there.
