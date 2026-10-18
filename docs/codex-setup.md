# Automated Codex builds

Codex is the selected default builder in `factory.toml`. This computer already
has Codex CLI 0.154.0 installed and signed in with ChatGPT. The factory invokes
that CLI; it does not require an OpenAI API key or copy authentication files.

## Use it

Open a regular PowerShell window from Windows Start/Terminal for independent
builds. Both normal-terminal and nested launches retain the workspace sandbox
and any organization-managed rules. The specific startup failure encountered
during setup was corrected by restoring the Windows backend selection below;
the corrected nested verification successfully edited the game and built it.

**Windows launcher correction:** the factory now explicitly passes
`-c windows.sandbox="elevated"` on Windows. Its `--ignore-user-config` isolation
previously also omitted the configured native sandbox backend. Merely passing
`--sandbox workspace-write` did not enable tool execution in those attempts.
The configured Windows backend passed direct sandboxed read/write probes, and
the corrected launcher permits shell inspection. This supersedes the earlier
assumption that the rejection was caused only by being nested inside this chat.
`elevated` names the Windows sandbox implementation; sandboxed commands run with
restricted privileges and retain the job's workspace/network limits. No full
access or approval bypass is used.

```powershell
Set-Location "$env:USERPROFILE\Documents\GitHub\game-prototype-factory"
python factory.py doctor
python factory.py ingest
python factory.py run --once
```

If unchanged sample ideas were previously built as demos, intake intentionally
does not enqueue them again. Retry the selected demo using current settings:

```powershell
python factory.py status
python factory.py retry YOUR-JOB-ID --current-config
python factory.py run --once
```

The flag preserves the original idea and preference text but uses the current
`factory.toml` for the new attempt. Without it, retry preserves the original
builder configuration too, including an earlier Claude selection. Existing job
records and files are never rewritten.

For new ideas, edit `ideas/*.md` and `preferences.md`, then use:

```powershell
# Worker terminal; uses new input snapshots and processes queued builds
python factory.py run --watch

# Separate monitor terminal, if the delivery's monitor is no longer running
python factory.py serve
```

Open [the local monitor](http://127.0.0.1:8765). Read `PROTOTYPE.md` in a completed
job's folder, and play it before exporting. To follow model activity:

```powershell
Get-Content .factory/jobs/YOUR-JOB-ID/codex.jsonl -Wait
```

## Configuration

```toml
[builder]
provider = "codex"
executable = "codex"
model = ""
timeout_seconds = 1200
install_timeout_seconds = 300
build_timeout_seconds = 180
```

The empty model lets the isolated CLI use its built-in default. The model name
in the user's existing global configuration was rejected by the ChatGPT-backed
CLI service during setup, so the factory does not copy it. You can instead name
a model available to your account. No global configuration is changed.
Changing the file affects future intake or explicit
`retry --current-config`, not already-queued attempts.

Codex uses your saved CLI login, with your account's usage limits. The factory
enforces a **wall-clock timeout** and kills the process tree on timeout or Ctrl+C.
The `max_budget_usd` and `max_turns` fields are **Claude-only**; they do not impose
Codex limits. No dollar-budget guarantee is made for Codex.

## Scope and isolation

Each run uses a fresh independent Git project and `codex exec --json --ephemeral`.
It ignores user config and parent AGENTS instructions, disables hooks, plugins,
subagents, host skill discovery and web search, and runs commands in a
`workspace-write` sandbox with command network access disabled. Managed policies
still apply. Saved authentication remains available to the CLI.

Codex can inspect files using shell commands and edit source within its job
workspace. It is instructed to leave dependency installation and production
verification to the factory. Unlike the Claude adapter, Codex is not restricted
to five file tools; its native sandbox controls command execution. No approval
or sandbox bypass flag is used. Installation/build subprocesses outside the
agent retain the existing trusted-source limitations described in README.

On Windows, an npm-installed Codex is launched through its Node entry point,
avoiding shell forwarding of complex arguments through `codex.cmd`. Native Codex
executables also work. Prompts are piped on stdin.

## Switch back to Claude

```toml
[builder]
provider = "claude"
executable = "claude"
model = "sonnet"
max_budget_usd = 3.0
max_turns = 40
timeout_seconds = 1200
```

Old job snapshots without a `provider` field remain Claude jobs. A failure of one
provider never silently falls back to another account/provider. An account limit,
unavailable model or sandbox failure is recorded in the job and its model log.

## Delivery boundary

No model worker is left running continuously. Start `run --watch` when you want
new files to trigger builds. Source export, GitHub deployment and Discord setup
continue to use the existing commands and remain explicit steps.

Local queue/protocol/build/export regression verification passed. Earlier Codex
attempts were blocked because the isolated launcher omitted the configured
Windows sandbox backend, and those attempts remain failed in history. After
explicitly restoring that backend, real attempt `orbit-harvest-b63943c1` changed
`index.html`, `src/main.ts`, `src/style.css` and `PROTOTYPE.md`, passed strict
TypeScript checking and the Vite production build, and reached `ready`.
Play it from the local monitor; gameplay balance remains a human playtest.
Non-demo jobs require both changed game source and a replaced starter
`PROTOTYPE.md` before they can become ready; a successful CLI exit or build of an
untouched template is insufficient.

References: [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode),
[authentication](https://learn.chatgpt.com/docs/auth),
[configuration](https://learn.chatgpt.com/docs/config-file/config-reference).
