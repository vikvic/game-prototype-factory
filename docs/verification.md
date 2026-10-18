# Verification record — 2026-10-16

## Resolved Windows Codex launcher — 2026-10-16

The isolation flag `--ignore-user-config` also omitted the user's configured
native Windows sandbox implementation. The launcher already requested
`workspace-write`, but its tools were rejected without the backend selection.
Explicit `-c windows.sandbox="elevated"` now restores that backend on Windows,
retaining the workspace sandbox, disabled command networking, managed restrictions
and `-a never`. No full-access or sandbox/approval bypass flag was added.

Direct native sandbox probes passed for reading `package.json` and creating,
reading and removing one temporary marker inside the job's workspace. A real
factory retry, `orbit-harvest-b63943c1`, then successfully inspected files,
changed `index.html`, `src/main.ts`, `src/style.css` and `PROTOTYPE.md`, passed
strict TypeScript checking and the production Vite build, and reached ready.
The requested 20-cell or 60-second game rules are documented in its report.
Gameplay balance has not been established by compilation.

This supersedes the earlier hypothesis that the failures were caused only by
being launched inside the Codex chat. The user's external PowerShell attempt
failed too; the explicit Windows backend corrected the live build. Previous
failed attempts and their logs remain intact. The model worker exited normally;
no continuous watcher, remote deployment or external notification was started.

## Codex adapter follow-up — 2026-10-16

The user requested Codex for automated builds. The default factory configuration
now selects Codex, while legacy job snapshots and Claude's adapter remain
supported. `retry --current-config` explicitly switches a new attempt to current
factory settings without changing its input/preferences or rewriting history.

Codex CLI 0.154.0 and its existing ChatGPT login were verified. The existing global
model name was rejected by the ChatGPT-backed CLI service, so the factory leaves
`builder.model` empty and lets the isolated CLI use its built-in default. Global
configuration/authentication were not changed.

The default-model invocation reached a completed turn. However, its tools were
blocked by the inherited read-only policy of this chat, and it left all starter
source/report files unchanged. An early ready status based only on protocol/build
success was corrected to failed after inspecting the output. A second small
attempt inside the chat's writable workspace encountered the same policy block.
No successful real Codex source edits are claimed. Existing failed attempts/logs
remain for inspection; no further automatic retry is running.

The completion gate now requires changed game source and a changed PROTOTYPE.md
for non-demo jobs, in addition to provider protocol success and production build.
Questions may still transition directly to needs_input. Focused checks verify
no-op/report-only rejection, provider flags/result parsing, legacy provider
dispatch independent of current defaults, and snapshot-preserving migration.
The existing full local smoke verification passed after these changes.

To launch independent Codex builds from a regular PowerShell window, follow
`docs/codex-setup.md`. No inherited permission values were removed or weakened;
no sandbox bypass flags, credential changes, notifications or deployments were
performed. The Codex adapter enforces the wall-clock timeout; Claude's dollar and
turn caps do not apply to Codex.

## Confirmed locally

- Python 3.14.2, Node 24.13.0, npm 11.6.2, Git 2.49.0.windows.1,
  Claude Code 2.1.301 available on this computer.
- Strict TypeScript checks and production Vite builds passed for Canvas and
  Three.js. The Three.js output produces a bundle-size advisory, not a failure.
- Local smoke verification passed for intake idempotence, immutable preferences,
  idea edits/reversions, duplicate/malformed metadata, atomic claiming, exclusive
  worker lock, recovery, fresh retry attempts, cancellation, timeouts, descendant
  termination, linked-directory export rejection, deployment reconciliation
  fixtures, and Discord mention suppression.
- A deterministic fake Claude subprocess completed the actual orchestrator
  lifecycle: independent Git project, dependency installation, protocol result,
  typecheck/build, source export, gallery build, HTTP monitor and preview routes.
- The Three.js demo lifecycle passed separately and was labeled `demo_ready`.
- Real Canvas and Three.js starter demos were built and exported in the user's
  Documents repository. The static gallery was generated locally.
- Both game pages rendered in the in-app browser. The Three.js scene rendered
  with no captured console warnings/errors, and clicking Restart reset its
  timer to 45 seconds. Full win/loss, touch, keyboard and device-matrix playtests
  were not exhaustively exercised. See `three-preview.png` for the browser view.

## Real Claude integration attempt

An authenticated live check launched Claude Code with a fresh job directory,
safe/restricted settings, and a budget estimate cap of $1. The initialization
event confirmed exactly `Edit`, `Glob`, `Grep`, `Read`, `Write` as available tools,
no MCP servers, no skills, and `acceptEdits` permission mode.

The service rejected the request with `usage_limit_reached` for the account's
weekly allowance, before generating a prototype. Its result reported **$0.00**,
zero input/output tokens. Consequently, a real model-authored prototype and
successful live agent file edits have **not** been verified. No automatic retry,
extra-usage purchase, authentication change, or billing change was made.

The runner preserves phase logs, records the attempt as failed, and presents an
actionable account-capacity error. Use `retry` or the optional live verification
command after capacity is available. Local fake-builder verification is separate
from this external-service limitation.

## External integrations

- GitHub Actions and Pages workflow source prepared; no remote repository,
  push, Actions run or live deployment performed.
- Discord persistent outbox and webhook payload/delivery path implemented;
  no webhook configured and no external message sent.
- `check-deploy` logic verified with local GitHub CLI response fixtures, including
  newer PR runs and removal of previously deployed prototypes. Real reconciliation
  remains unverified until a repository actually deploys.

## Review corrections

- Windows Job Object ownership stops descendants even after their parent exits;
  kill-on-close also covers a worker crash. Cleanup failures retain process markers.
- Returning to an earlier idea revision enqueues the current text and supersedes
  stale queued work.
- Source export rejects Windows junctions, symlinks, and resolved paths outside
  the selected source directory.
- Production reconciliation ignores PR builds and clears links removed from the
  newly confirmed deployment.

## Local monitor left running for this delivery

The read-only monitor is available at http://127.0.0.1:8765 with both starter
play links. Its PID is in `.factory/monitor.pid`; logs are `.factory/monitor.log`
and `.factory/monitor-error.log`. To stop this delivery's monitor:

```powershell
Stop-Process -Id (Get-Content .factory/monitor.pid)
```

Start another monitor later with `python factory.py serve` and stop it with
Ctrl+C. No builder or background watcher was left running.
