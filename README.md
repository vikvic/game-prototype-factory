# Game prototype factory

The new **Topical Arcade** workflow adds researched opportunities, reusable games
and subject-specific editions in a separate queue. See [the operator guide](docs/topical-factory.md).
Start with `python factory.py topical readiness`. Historical prototype commands remain available.

For the first advertising connection, see [Reddit Ads setup and paused drafts](docs/reddit-ads.md).
`python factory.py ads reddit doctor` checks local setup without contacting Reddit.
This adapter can create only paused campaign containers; it cannot buy traffic.

**Markdown idea → queued job → local game folder → web playtest link.**

A local Python orchestrator hands each idea to a fresh Codex or Claude Code process in
its own Git project. You can inspect the inputs, source, logs, and build output.
Canvas is the default for 2D; select Three.js for a 3D idea. Human playtesting
decides whether a prototype is promising.

**Codex is now the default automated builder.** Claude remains supported. Follow
[Codex setup](docs/codex-setup.md) for the current commands, authentication,
provider selection and limits. Claude-specific sections below describe that
adapter; its dollar/turn caps do not apply to Codex.

## First run on Windows

Requires Python **3.11+**, Node **22.12+** (Node 24 recommended), npm, Git, and
Codex CLI (developed with 0.154.0) or Claude Code (developed with 2.1.301).
Python has no third-party dependencies. npm needs access to its registry on the
first build. You do not need GitHub or Discord credentials for local work.

```powershell
Set-Location "$env:USERPROFILE\Documents\GitHub\game-prototype-factory"
python factory.py doctor
python factory.py init
python factory.py ingest
python factory.py run --once --demo
python factory.py serve
```

Open [the local monitor](http://127.0.0.1:8765). Its **Play locally** link launches
the built game. Demo mode compiles the untouched starter and labels it
`demo_ready`; it does **not** implement the idea or invoke a model.

For an actual idea build, copy the job ID shown by `status` and retry it without
demo mode:

```powershell
python factory.py status
python factory.py retry YOUR-JOB-ID --current-config
python factory.py run --once
```

`run` invokes your selected builder using its existing CLI authentication.
The default Codex path uses your saved ChatGPT login; `codex login` signs in
if needed. It enforces the configured wall-clock timeout. See
[Codex setup](docs/codex-setup.md) for its sandbox and provider settings.

When selecting Claude, `run` invokes your installed Claude Code.
If `doctor` reports that you are not logged in, run `claude auth login` locally.
Do not paste credentials into this repository or chat. The default per-job
estimated budget is **$3**, 40 turns, and 20 minutes; edit `factory.toml` before
ingesting. Claude's budget is an estimate, not an exact billing ceiling.

## Your everyday loop

1. Write one `.md` file per idea in `ideas/`. A sentence, several paragraphs,
   or a full inline design document all work.
2. Edit `preferences.md` as your tastes become clearer.
3. Run `python factory.py ingest`, then `python factory.py run --once`.
4. Keep `python factory.py serve` running in another terminal. Play the result,
   read its `PROTOTYPE.md`, and record your own conclusions.
5. Export a promising prototype, inspect the exported source, then commit/push
   it to deploy through GitHub Actions.

For continuous local operation, use a worker terminal and a monitor terminal:

```powershell
# Terminal 1: watches Markdown changes and processes the persistent queue
python factory.py run --watch

# Terminal 2: read-only status and game previews
python factory.py serve
```

The worker must remain running for new ideas to be ingested and built. `run`
without `--watch` drains already-queued work and waits for manual intake. No
Windows service, scheduled background job, or cloud agent is installed.

## Idea files

```markdown
---
id: magnetic-garden
title: Magnetic Garden
template: canvas
priority: 10
enabled: true
---
Pull drifting seeds toward a garden while avoiding rocks. Make holding the
magnet too long risky. One arena, a one-minute round, score and instant restart.
```

The optional front matter is deliberately small: one `key: value` per line,
optional surrounding quotes, no nested YAML or inline comments. Supported keys:

| Field | Behavior |
| --- | --- |
| `id` | Stable lowercase letters/digits/hyphens, 1–48 characters. Defaults to filename stem. |
| `title` | Up to 200 characters. Defaults to the first nonempty body line. |
| `template` | `canvas` (default) or `three`. Explicit selection; no guess based on keywords. |
| `priority` | Integer -100 to 100. Higher priority runs first, then oldest intake. |
| `enabled` | `true` or `false`. Disabling skips future intake; cancel a queued job explicitly. |

Example 3D intake:

```powershell
Copy-Item examples/three-idea.md ideas/neon-salvage.md
python factory.py ingest
```

Intake parses and validates the entire batch before writing any jobs. Duplicate
IDs in a batch fail. Re-ingesting unchanged text creates nothing. Editing an idea
creates a new revision and cancels its older queued revisions. Running work is
allowed to finish. Inputs and preferences are snapshotted at intake; later edits
cannot alter an already-queued job. Preference changes alone do not replay all
old ideas. Edit an idea to apply new preferences. `retry` deliberately reuses
the original snapshot and creates a fresh attempt/folder.

If Claude cannot make a playable interpretation, it writes `QUESTION.md` and the
job becomes `needs_input`. Read the question from the job's source folder, add
the answer to the original idea, then ingest again. Most ambiguity should instead
be resolved by assumptions documented in `PROTOTYPE.md`.

## Status, evidence, and recovery

```powershell
python factory.py status
python factory.py show YOUR-JOB-ID
python factory.py events YOUR-JOB-ID
python factory.py cancel YOUR-QUEUED-JOB-ID
python factory.py retry YOUR-FAILED-JOB-ID
```

| State | Meaning |
| --- | --- |
| `queued` | Waiting for the single worker. |
| `running` | Preparing, installing, calling Claude, or verifying. |
| `ready` | The selected builder reported success and the production build passed. Playtest remains human work. |
| `demo_ready` | Untouched starter built successfully. No Claude implementation. |
| `needs_input` | Builder left a blocking `QUESTION.md`. |
| `failed` | Install, builder, protocol, or build failed. Read the error and phase log. |
| `interrupted` | Worker stopped or abandoned attempt was recovered. Retry explicitly. |
| `cancelled` | Queued job was cancelled or superseded. |

Each attempt lives in `.factory/jobs/JOB-ID/`:

- `idea.md`, `preferences.md`, `config.json`: immutable intake snapshots.
- `project/`: independent Git project, source, `PROTOTYPE.md`, and built `dist/`.
- `install.log`, `codex.jsonl` or `claude.jsonl`, `build.log`: phase evidence; model events stream
  to disk while it works.
- `process.json`: PID while a supervised subprocess is active.

Follow live output with `Get-Content .factory/jobs/JOB-ID/claude.jsonl -Wait`.
The dashboard intentionally does not expose raw prompts or logs. It shows phases,
events, error messages, folders, and play links. It binds to loopback only and
has no mutation endpoints.

Ctrl+C stops the active process tree and records `interrupted`. To cancel
queued work, use `cancel`. After a crash or force-closed worker:

```powershell
python factory.py recover
python factory.py retry YOUR-INTERRUPTED-JOB-ID
python factory.py run --once
```

Recovery first obtains the OS worker lock. If a recorded child PID is still alive,
it refuses recovery: inspect that process and stop its tree before proceeding.
PID reuse is treated conservatively; inspect stale `process.json` evidence rather
than blindly killing an unrelated PID. Windows jobs use kernel process ownership
with kill-on-close, so descendants are stopped even when their original parent
exits first or the worker crashes. Unix uses process groups; a hard worker crash
can leave a group running, and recovery refuses to silently duplicate it. An
incomplete launch marker requires manual inspection before it is removed.

## What isolation means here

Every attempt has a separate folder/Git root and fresh Claude session, with no
resume and no saved model session. Claude runs with `--safe-mode`, `--restricted`,
no user/project/local setting sources, empty strict MCP configuration, disabled
hooks/skills, and **Read/Edit/Write/Glob/Grep only**. The orchestrator, rather than
Claude, runs dependency installation and production builds. There is no
`--dangerously-skip-permissions`. Organization-managed policies still apply.

This is file/context isolation, **not an OS container**. The build toolchain and
generated Vite configuration execute as your user. Use trusted ideas and inspect
generated source before export; use a dedicated machine/container for untrusted
work. Factory Discord/GitHub environment secrets are removed from build children.
Claude's own account authentication remains available.

## Export and GitHub Pages deployment

Local work never creates a remote repository, pushes, or publishes automatically.

```powershell
python factory.py publish YOUR-READY-JOB-ID
python factory.py build-site
python -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Open [the local gallery](http://127.0.0.1:8080). `publish` exports an allowlisted
source tree into `prototypes/JOB-ID/`; it does not mark the game live. Windows
junctions, symlinks, and resolved paths outside the source are rejected. Existing
exports are never overwritten. Review before committing. Job snapshots, queue,
logs, `.env`, `.git`, dependencies, and local build output are excluded. Everything
under exported `src/` and `public/` is intentionally publishable game content.

To deploy:

1. Create a GitHub repository using the GitHub website or your existing `gh`
   login, and set it as this repository's `origin`. Choose its visibility yourself.
2. In GitHub **Settings → Pages**, choose **GitHub Actions** as the source.
3. Commit the factory and reviewed `prototypes/` files, then push to `main`.
4. The **Prototype Arcade Pages** workflow builds a gallery and all exported
   games, uploads the static artifact, and deploys it. PRs build but never deploy.
   The separate **Checks** workflow verifies the queue and both templates.
5. Open the actual URL reported by the deployment. Enter `owner/repository` and
   that HTTPS Pages URL into `[deploy]` in `factory.toml`.
6. `python factory.py check-deploy` uses your `gh` authentication to confirm the
   latest successful deployment job and its committed game paths. Only then does
   the monitor show **Confirmed deployment** links. Open those links for live
   verification; successful Actions deployment is not a browser playtest.

Example commands after creating an empty remote repository:

```powershell
git remote add origin https://github.com/YOUR-OWNER/YOUR-REPOSITORY.git
git status --short
git add .gitignore .env.example factory.py factory.toml preferences.md README.md prototype_factory templates ideas examples tools docs .github prototypes
git diff --cached --check
git commit -m "Add local game prototype factory"
git push -u origin main
```

Replace owner/repository; the factory does not need a GitHub token stored in any
file. Actions uses its own `GITHUB_TOKEN`/OIDC permissions. For a private repository,
check your account's Pages availability. Static output also works on another
static host: upload `dist/`; every game's Vite base is relative.

## Optional Discord notifications

Create an incoming webhook in the intended Discord channel. No bot account is
needed for outbound notifications. Set it only in the worker terminal:

```powershell
$env:DISCORD_WEBHOOK_URL = [System.Net.NetworkCredential]::new('', (Read-Host 'Discord webhook URL' -AsSecureString)).Password
python factory.py run --watch
```

Worker start, completion, failure, questions, export and confirmed deployment
events go into a persistent outbox. The worker sends at most ten due messages per
poll, retries failures up to five times with backoff, and disables mentions. Old
unsent events are delivered if you enable the webhook later. Notification failure
does not change a game's build status. A network failure after delivery can cause
duplicate notification delivery; the job ID identifies the event's game.

```powershell
python factory.py notify
python factory.py notify --retry-failed
Remove-Item Env:DISCORD_WEBHOOK_URL
```

Do not run `notify` while the worker is running; it uses the same lock. Delivery
errors are stored in `.factory/queue.sqlite3`'s `outbox` table without the secret
URL. `.env.example` documents the name; `.env` is ignored and not automatically
loaded. To receive **actual deployment** notifications from CI, add
`DISCORD_WEBHOOK_URL` as a GitHub **Actions repository secret**. The Pages workflow
reports success with the real gallery link or reports a deployment failure.

## Verification

```powershell
# Fast, offline queue/process/payload checks, no model calls
python tools/verify.py --quick

# Full local smoke verification: fake Claude subprocess, real npm builds,
# gallery, dashboard, previews; no model or external notification
python tools/verify.py

# Optional live integration: one tiny real Claude edit, estimated $1 cap
python tools/verify.py --live-claude
```

Verification uses temporary workspaces and preserves failure evidence under
`.factory/last-verification-failure`. It does not send Discord messages or deploy.
Template `npm run build` performs both strict typechecking and a production
build. These checks do not establish gameplay quality or accessibility across
every device. Runtime and external-service checks performed during delivery are
recorded separately in `docs/verification.md`.

## Layout

```text
ideas/                 Your Markdown inbox
preferences.md         Your evolving design preferences
factory.toml           Worker and integration settings (no secrets)
prototype_factory/     Intake, SQLite, runner, dashboard, outbox, export
templates/{canvas,three}/  Locked, playable minimal TypeScript starters
prototypes/            Reviewed source exports, committed for deployment
tools/                 Gallery builder, bounded verification, CI notifier
.github/workflows/     Basic checks and Pages deployment
.factory/              Ignored local state, private inputs, jobs, logs
dist/                  Ignored generated static gallery
```

## Reference documentation

- [Claude Code CLI and permission flags](https://code.claude.com/docs/en/cli-reference)
- [Vite static deployment and relative base](https://vite.dev/guide/static-deploy)
- [Three.js WebGPU renderer and WebGL 2 fallback](https://threejs.org/docs/pages/WebGPURenderer.html)
- [Discord webhook execution and allowed mentions](https://docs.discord.com/developers/resources/webhook)
