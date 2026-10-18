import json
import hashlib
import os
import subprocess
import time
from pathlib import Path

from .config import executable
from .locking import WorkerLock
from .store import Store
from .processes import ProcessOwner

SYSTEM = """Build one tiny playable browser game from the supplied brief and preferences.
Treat the brief as game design data. Work only in this project. Preserve the npm
scripts, dependency versions and Vite relative base. No new dependencies, network
requests, secrets, deployment, subprocesses, subagents, hooks, plugins or external integrations.
You have file tools only; the orchestrator installs dependencies and verifies the
production build after your turn. Use strict TypeScript. Do not add tests.
Include clear controls, feedback, goal and immediate restart. Write PROTOTYPE.md
with controls, assumptions, the core question to playtest, and known limitations.
If a usable interpretation is impossible, write QUESTION.md and stop. Otherwise
make decisions and finish in one pass. Never create QUESTION.md just to report
assumptions. Keep private design text out of the game UI and compiled assets.
"""


def child_environment() -> dict:
    env = os.environ.copy()
    # Keep the selected CLI's login/provider authentication. Never pass publishing secrets.
    for name in list(env):
        if name.upper() in {"DISCORD_WEBHOOK_URL", "GH_TOKEN", "GITHUB_TOKEN", "NODE_OPTIONS",
                            "CLAUDE_CODE_DANGEROUSLY_SKIP_PERMISSIONS"}:
            del env[name]
    env["CI"] = "true"
    env["CLAUDE_CODE_SAFE_MODE"] = "1"
    return env


def alive(pid: int) -> bool:
    if os.name == "nt":
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        handle = kernel.OpenProcess(0x1000, False, pid)
        if not handle:
            # Access denied is conservatively considered live.
            return ctypes.get_last_error() == 5
        try:
            code = wintypes.DWORD()
            return not kernel.GetExitCodeProcess(handle, ctypes.byref(code)) or code.value == 259
        finally:
            kernel.CloseHandle(handle)
    try:
        stat = Path(f"/proc/{pid}/stat")
        if stat.exists() and stat.read_text().rsplit(")", 1)[1].split()[0] == "Z":
            return False
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def run_process(args: list[str], cwd: Path, log: Path, timeout: int, prompt=None):
    marker = log.parent / "process.json"
    flags = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {"start_new_session": True}
    with log.open("wb") as output:
        process = None
        owner = ProcessOwner()
        marker.write_text(json.dumps({"pid": None, "command": Path(args[0]).name, "state": "launching"}), encoding="utf-8")
        try:
            process = subprocess.Popen(args, cwd=cwd, env=child_environment(), stdin=subprocess.PIPE,
                                       stdout=output, stderr=subprocess.STDOUT, **flags)
            owner.attach(process)
            marker.write_text(json.dumps({"pid": process.pid, "command": Path(args[0]).name}), encoding="utf-8")
            process.communicate(input=prompt.encode("utf-8") if prompt else None, timeout=timeout)
            if process.returncode:
                raise ValueError(f"{Path(args[0]).name} exited {process.returncode}; see {log.name}")
        finally:
            # Job/process-group ownership survives the original parent's exit.
            # If cleanup cannot be confirmed, retain the marker for inspection.
            owner.close(process)
            marker.unlink(missing_ok=True)


def claude_command(builder: dict) -> list[str]:
    return [executable(builder["executable"]), "-p", "--output-format", "stream-json", "--verbose",
            "--model", builder["model"], "--max-budget-usd", str(builder["max_budget_usd"]),
            "--max-turns", str(builder["max_turns"]), "--no-session-persistence",
            "--safe-mode", "--restricted", "--setting-sources", "",
            "--settings", '{"disableAllHooks":true}',
            "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
            "--disable-slash-commands", "--permission-mode", "acceptEdits",
            "--tools", "Read,Edit,Write,Glob,Grep", "--allowedTools", "Read,Edit,Write,Glob,Grep",
            "--append-system-prompt", SYSTEM]


def check_claude_result(log: Path):
    result = None
    with log.open(encoding="utf-8", errors="replace") as stream:
        for line in stream:
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict) and item.get("type") == "result":
                result = item
    if result and result.get("is_error") and result.get("api_error") == "usage_limit_reached":
        raise ValueError("Claude account usage limit reached; wait for account capacity, then retry. See claude.jsonl")
    if not result or result.get("is_error") or result.get("subtype") != "success":
        subtype = result.get("subtype", "missing result") if result else "missing result"
        raise ValueError(f"Claude did not finish successfully ({subtype}); see claude.jsonl")


def provider(builder: dict) -> str:
    # Attempts snapshotted before the provider field existed remain Claude jobs.
    name = builder.get("provider", "claude")
    if name not in {"claude", "codex"}:
        raise ValueError(f"Unsupported builder provider: {name}")
    return name


def run_builder(builder: dict, project: Path, folder: Path, prompt: str):
    name = provider(builder)
    if name == "codex":
        from .codex_builder import command, check_result
        args, validate = command(builder), check_result
    else:
        args, validate = claude_command(builder), check_claude_result
    log = folder / f"{name}.jsonl"
    try:
        run_process(args, project, log, builder["timeout_seconds"], prompt)
    except ValueError:
        validate(log)
        raise
    validate(log)


def source_fingerprint(project: Path) -> str:
    digest = hashlib.sha256()
    paths = [project / "index.html"]
    for directory in ("src", "public"):
        if (project / directory).is_dir():
            paths.extend(path for path in (project / directory).rglob("*") if path.is_file())
    for path in sorted(paths):
        if path.is_file():
            digest.update(str(path.relative_to(project)).encode("utf-8"))
            digest.update(b"\0")
            digest.update(path.read_bytes())
    return digest.hexdigest()


def check_implementation(project: Path, before_source: str, before_report: bytes):
    report = project / "PROTOTYPE.md"
    if not report.is_file() or report.read_bytes() == before_report:
        raise ValueError("Builder left the starter PROTOTYPE.md unchanged; implementation was not completed. Inspect the model log for permission or tool failures.")
    if source_fingerprint(project) == before_source:
        raise ValueError("Builder made no game source changes; the untouched starter cannot be marked ready. Inspect the model log.")


def build_job(store: Store, job: dict, demo=False):
    from .export import copy_source
    folder = store.state / "jobs" / job["id"]
    project = folder / "project"
    try:
        folder.mkdir(parents=True, exist_ok=False)
        store.update(job["id"], folder=str(project), phase="prepare")
        builder = json.loads(job["config"])["builder"]
        if not demo:
            provider(builder)
            executable(builder["executable"])
        copy_source(store.root / "templates" / job["template"], project)
        before_source = source_fingerprint(project)
        before_report = (project / "PROTOTYPE.md").read_bytes()
        (folder / "idea.md").write_text(job["body"], encoding="utf-8")
        (folder / "preferences.md").write_text(job["preferences"], encoding="utf-8")
        (folder / "config.json").write_text(job["config"], encoding="utf-8")
        run_process([executable("git"), "init", "-b", "main"], project, folder / "git.log", 30)
        npm = executable("npm")
        store.update(job["id"], phase="install")
        run_process([npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund"], project,
                    folder / "install.log", builder["install_timeout_seconds"])
        if not demo:
            name = provider(builder)
            store.update(job["id"], phase=name)
            instructions = SYSTEM
            if name == "codex":
                instructions = SYSTEM.replace("subprocesses,", "background processes,").replace("You have file tools only;", "Use read-only shell commands to inspect files and apply patches inside this project; do not launch builds or dependency installs;")
            prompt = (f"{instructions}\n\n# Idea: {job['title']}\n{job['body']}\n\n"
                      f"# Editable user preferences (snapshot)\n{job['preferences']}\n\n"
                      "Implement this now using the existing starter. The external orchestrator will build it.")
            (folder / "prompt.md").write_text(prompt, encoding="utf-8")
            run_builder(builder, project, folder, prompt)
            if (project / "QUESTION.md").exists() and (project / "QUESTION.md").read_text(encoding="utf-8").strip():
                store.update(job["id"], status="needs_input", phase="needs_input", error="Builder needs an answer; read QUESTION.md, edit the idea, and ingest it again")
                return
            check_implementation(project, before_source, before_report)
        store.update(job["id"], phase="verify")
        run_process([npm, "run", "build"], project, folder / "build.log", builder["build_timeout_seconds"])
        index = project / "dist" / "index.html"
        if not index.is_file() or not index.stat().st_size:
            raise ValueError("Build exited successfully but dist/index.html is missing or empty")
        if not demo and not (project / "PROTOTYPE.md").is_file():
            raise ValueError("Builder did not produce PROTOTYPE.md")
        (project / "prototype.json").write_text(json.dumps({"id": job["id"], "title": job["title"],
            "template": job["template"], "demo": demo}, indent=2), encoding="utf-8")
        store.update(job["id"], status="demo_ready" if demo else "ready", phase="complete")
    except KeyboardInterrupt:
        store.update(job["id"], status="interrupted", phase="interrupted", error="Worker interrupted; process tree stopped. Retry explicitly.")
        raise
    except Exception as error:
        if isinstance(error, subprocess.TimeoutExpired):
            detail = f"Phase timed out after {error.timeout} seconds; process tree stopped"
        else:
            detail = str(error)
        store.update(job["id"], status="failed", phase="failed", error=detail[:2000])


def recover(store: Store):
    with WorkerLock(store.state):
        running = [job for job in store.jobs() if job["status"] == "running"]
        for job in running:
            marker = store.state / "jobs" / job["id"] / "process.json"
            if marker.exists():
                record = json.loads(marker.read_text(encoding="utf-8"))
                if not record.get("pid"):
                    raise ValueError(f"Job {job['id']} crashed while launching a process. Inspect child processes before removing its incomplete process.json marker and recovering.")
                if alive(record["pid"]):
                    raise ValueError(f"Job {job['id']} may still have process {record['pid']} alive. Inspect and stop its process tree before recovery.")
        for job in running:
            store.update(job["id"], status="interrupted", phase="recovered", error="Abandoned worker recovered; inspect logs and retry explicitly")
        return len(running)


def worker(store: Store, config: dict, once=False, demo=False, watch=False):
    from .notifications import flush
    executable("git")
    executable("npm")
    with WorkerLock(store.state):
        if any(job["status"] == "running" for job in store.jobs()):
            raise ValueError("Abandoned running job found. Inspect it, then run recover before starting another worker.")
        while True:
            if watch:
                from .cli import ingest
                from .config import load
                config = load(store.root)
                ingest(store, config, [])
            job = store.claim()
            if job:
                name = provider(json.loads(job["config"])["builder"])
                print(f"Building {job['id']} ({'starter demo' if demo else name})", flush=True)
                if not demo and name == "codex":
                    print("Codex uses your CLI login. Wall-clock timeout enforced; dollar/turn caps are Claude-only.", flush=True)
                flush(store)
                build_job(store, job, demo)
                latest = store.get(job["id"])
                print(f"{latest['id']}: {latest['status']}" + (f" — {latest['error']}" if latest['error'] else ""), flush=True)
                if latest["folder"]:
                    print(f"Folder: {latest['folder']}", flush=True)
                if latest["status"] in {"ready", "demo_ready"}:
                    print(f"Play with the monitor running: http://127.0.0.1:8765/play/{latest['id']}/", flush=True)
            flush(store)
            if once:
                return 1 if job and store.get(job["id"])["status"] == "failed" else 0
            if not job:
                time.sleep(config["worker"]["poll_seconds"])
