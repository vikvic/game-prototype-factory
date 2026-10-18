# Game prototype factory

Turn one Markdown file per idea into a playable web prototype, an inspectable source folder, and eventually a deployed link. The human evaluates the game; compilation is not evidence that the design is fun or even fully playable.

## Scope and decisions

- New repository at `C:\Users\vic\Documents\GitHub\game-prototype-factory`, chosen by the user. No existing repositories or synced project sources are changed.
- Python 3.11+ standard library for intake, SQLite queue, a single worker, subprocess supervision, Discord outbox, and a read-only loopback dashboard. Node 22.12+ and npm build the games.
- Small, reusable Vite + strict TypeScript templates: Canvas for 2D by default, Three.js for explicitly requested 3D. Both contain a playable collection game, restart, keyboard and pointer controls. Three.js uses WebGL for a broad initial baseline; WebGPU is a later renderer choice, not a limitation of Three.js.
- One Markdown idea per file, optional simple front matter (`id`, `title`, `template`, `priority`, `enabled`). No YAML dependency. Arbitrary prose and full inline design documents are accepted. Stable IDs plus content hashes deduplicate intake. Edited ideas produce new revisions; preference changes alone do not silently replay old ideas.
- Editable `preferences.md` is snapshotted at intake. `factory.toml` controls model, budget, timeout, and polling. Jobs never read later edits to their brief/preferences.
- Fresh job directory and local Git repository per attempt, with a fresh noninteractive Claude Code session. This isolates files/context, not the host OS. No permission bypass; restricted tools, no MCP servers, no inherited project hooks/settings. Timeout terminates the process tree. Factory/webhook/GitHub secrets are removed from the child environment.
- Persistent queue states: queued, running, ready, demo_ready, needs_input, failed, interrupted, cancelled. Atomic claiming plus an OS worker lock prevent duplicate execution. Recovery is explicit and requires the worker lock. Retry creates a new attempt and preserves previous artifacts.
- Claude can write `QUESTION.md` to request a genuinely blocking answer. The worker exposes this as needs_input. The human edits the idea with the answer and ingests a revision.
- A demo mode builds the untouched starter without invoking Claude or consuming model credits; it is labeled demo_ready.
- Local CLI and dashboard show phase, attempts, timestamps, events, errors, folder, logs, local preview path, and deployment status. No mutation endpoints in the dashboard.
- `publish` explicitly exports successful job source to `prototypes/`, which GitHub Actions builds into one static gallery. Push and repository creation remain human steps. Deployment URL is only marked live after a successful GitHub Actions deployment is checked. No token required for local work.
- Discord webhook is optional, read from the environment only. Persistent outbox, bounded retries, no secret URLs in error messages, and mentions disabled. The worker delivers configured state-change notifications. A separate CI notifier reports actual deployment success/failure using a repository secret.

## Constraints and non-goals

No hosted agent service, Discord command bot, concurrent builders, external assets, automatic pushes, automatic billing setup, or production hardening in v1. The worker runs while its terminal/session remains alive. Do not store credentials, `.env`, queue contents, job logs, or preferences in deployed assets. Python has no third-party dependencies. Verification covers queue lifecycle, a fake Claude job, template builds, gallery generation, and browser inspection where available; do not call this a verified live Claude/deploy/Discord run without exercising those services.
