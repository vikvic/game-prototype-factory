"""Codex's non-interactive protocol, kept separate from Claude's CLI contract."""
import json
import os
from pathlib import Path

from .config import executable


def command(builder: dict) -> list[str]:
    cli = Path(executable(builder["executable"]))
    prefix = [str(cli)]
    # Launch npm's JS entry directly on Windows rather than forwarding complex
    # arguments through a .cmd shell wrapper. Prompts always arrive on stdin.
    if os.name == "nt" and cli.suffix.lower() in {".cmd", ".ps1"}:
        entry = cli.parent / "node_modules" / "@openai" / "codex" / "bin" / "codex.js"
        if not entry.is_file():
            raise ValueError("Cannot resolve the Codex npm launcher. Set builder.executable to the native Codex executable.")
        prefix = [executable("node"), str(entry)]
    args = prefix + ["-a", "never", "exec", "--json", "--ephemeral", "--color", "never",
                     "--ignore-user-config", "--sandbox", "workspace-write",
                     "--disable", "hooks", "--disable", "plugins", "--disable", "multi_agent",
                     "--disable", "skill_search", "--enable", "skip_host_skill_discovery",
                     "-c", "suppress_unstable_features_warning=true",
                     "-c", "project_doc_max_bytes=0", "-c", 'web_search="disabled"',
                     "-c", "sandbox_workspace_write.network_access=false",
                     "-c", "shell_environment_policy.ignore_default_excludes=false"]
    if builder.get("model"):
        args += ["--model", builder["model"]]
    if os.name == "nt":
        # --ignore-user-config also omits the user's native sandbox backend.
        # Keep Windows sandboxing explicitly enabled for the requested
        # workspace-write policy; no full-access or approval bypass is used.
        args += ["-c", 'windows.sandbox="elevated"']
    return args + ["-"]


def check_result(log: Path):
    completed, failure, model_unavailable = False, False, False
    with log.open(encoding="utf-8", errors="replace") as stream:
        for line in stream:
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue  # CLI diagnostics on stderr share the log file.
            if not isinstance(event, dict):
                continue
            if event.get("type") == "turn.completed":
                completed = True
            if event.get("type") == "turn.failed":
                failure = True
                error = event.get("error", {})
                message = error.get("message", "") if isinstance(error, dict) else str(error)
                model_unavailable = "not supported when using Codex with a ChatGPT account" in message
            # `error` can report a recoverable network reconnect. A completed
            # turn is authoritative; a terminal turn.failed always fails.
    if model_unavailable:
        raise ValueError('Codex model is unavailable for this ChatGPT login. Set builder.model = "" to use the CLI default, then retry --current-config; see codex.jsonl')
    if failure or not completed:
        raise ValueError("Codex did not complete a successful turn; see codex.jsonl (check login, model availability, usage limits and sandbox errors)")
