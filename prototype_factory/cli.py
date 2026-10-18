import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from . import config
from .store import Store


def parser():
    cli = argparse.ArgumentParser(description="Local Markdown → game prototype factory")
    cli.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    commands = cli.add_subparsers(dest="command", required=True)
    commands.add_parser("init", help="Initialize the local SQLite queue; never overwrites intake/config")
    commands.add_parser("doctor", help="Check local tools and selected builder auth without invoking a model")
    intake = commands.add_parser("ingest", help="Snapshot new/edited Markdown ideas into the queue")
    intake.add_argument("paths", nargs="*", type=Path)
    commands.add_parser("status", help="List jobs")
    show = commands.add_parser("show", help="Show a job snapshot, artifacts, and events")
    show.add_argument("id")
    events = commands.add_parser("events", help="Recent job events")
    events.add_argument("id", nargs="?")
    worker = commands.add_parser("run", help="Run one worker; Ctrl+C stops its process tree")
    worker.add_argument("--once", action="store_true", help="Process at most one queued job")
    worker.add_argument("--demo", action="store_true", help="Build the starter only; no model call")
    worker.add_argument("--watch", action="store_true", help="Ingest edited idea files before each poll")
    for name in ("retry", "cancel", "publish"):
        sub = commands.add_parser(name)
        sub.add_argument("id")
        if name == "retry":
            sub.add_argument("--current-config", action="store_true", help="Use current factory builder settings; preserve original idea/preferences")
    commands.add_parser("recover", help="Mark abandoned running jobs interrupted; requires no live worker/child")
    monitor = commands.add_parser("serve", help="Read-only loopback monitor and local game preview")
    monitor.add_argument("--port", type=int, default=8765)
    commands.add_parser("build-site", help="Build all exported prototype source into dist/")
    commands.add_parser("check-deploy", help="Confirm a successful GitHub Pages deployment")
    notify = commands.add_parser("notify", help="Send pending Discord events if configured")
    notify.add_argument("--retry-failed", action="store_true", help="Reset exhausted notification attempts")
    return cli


def ingest(store, settings, paths):
    from .intake import read_batch
    preferences = store.root / "preferences.md"
    if not preferences.is_file():
        raise ValueError("preferences.md is missing")
    added = store.enqueue(read_batch(paths or [store.root / "ideas"]), preferences.read_text(encoding="utf-8-sig"), settings)
    for job_id in added:
        print(f"Queued {job_id}")
    print(f"{len(added)} new job(s)")


def doctor(settings):
    missing = False
    for name in ("git", "node", "npm", settings["builder"]["executable"]):
        try:
            path = config.executable(name)
            result = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=15)
            print(f"{name}: {result.stdout.strip()} ({path})")
            missing |= result.returncode != 0
            if name == "node":
                numbers = tuple(int(part) for part in result.stdout.strip().lstrip("v").split(".")[:2])
                if numbers < (22, 12):
                    print("Node 22.12+ is required")
                    missing = True
        except (ValueError, OSError, subprocess.TimeoutExpired):
            print(f"{name}: unavailable")
            missing = True
    name = settings["builder"].get("provider", "claude")
    try:
        auth = ["login", "status"] if name == "codex" else ["auth", "status"]
        result = subprocess.run([config.executable(settings["builder"]["executable"]), *auth], capture_output=True, text=True, timeout=20)
        login = "codex login" if name == "codex" else "claude auth login"
        print(f"{name} authentication: " + ("available" if result.returncode == 0 else f"not logged in; run {login}"))
        missing |= result.returncode != 0
    except (ValueError, OSError, subprocess.TimeoutExpired):
        print(f"{name} authentication: unknown")
        missing = True
    if name == "codex":
        backend = "; Windows backend: elevated" if os.name == "nt" else ""
        print(f"Codex: saved CLI login; requests workspace-write{backend}; wall-clock timeout only (no dollar/turn cap).")
    print("Discord: " + ("configured (not sent/verified)" if os.environ.get("DISCORD_WEBHOOK_URL") else "optional; not configured"))
    print("No model call, notification, remote creation or deployment was performed.")
    return int(missing)


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        root = args.root.resolve()
        if not root.is_dir():
            raise ValueError(f"Factory root does not exist: {root}")
        settings = config.load(root)
        if args.command == "doctor":
            return doctor(settings)
        store = Store(root)
        if args.command == "init":
            print(f"Local queue: {store.path}")
        elif args.command == "ingest":
            ingest(store, settings, args.paths)
        elif args.command == "status":
            jobs = store.jobs()
            for job in jobs:
                print(f"{job['id']:<57} {job['status']:<13} {job['phase']:<12} {job['title']}")
            if not jobs:
                print("No jobs. Add Markdown ideas and run ingest.")
        elif args.command == "show":
            job = store.get(args.id)
            job["config"] = json.loads(job["config"])
            job["events"] = store.events(args.id)
            print(json.dumps(job, indent=2, ensure_ascii=False))
        elif args.command == "events":
            print(json.dumps(store.events(args.id), indent=2))
        elif args.command == "run":
            from .runner import worker
            return worker(store, settings, args.once, args.demo, args.watch)
        elif args.command == "retry":
            print(f"Queued {store.retry(args.id, settings if args.current_config else None)}")
        elif args.command == "cancel":
            store.cancel(args.id)
            print("Cancelled")
        elif args.command == "recover":
            from .runner import recover
            print(f"{recover(store)} abandoned job(s) marked interrupted")
        elif args.command == "serve":
            from .dashboard import serve
            serve(store, args.port)
        elif args.command == "publish":
            from .export import publish
            print(f"Exported to {publish(store, args.id)}. Commit/push explicitly to deploy; this is not a live deployment.")
        elif args.command == "build-site":
            from .export import build_site
            print(f"Static gallery built: {build_site(root)}")
        elif args.command == "check-deploy":
            from .export import check_deploy
            print(f"{check_deploy(store, settings)} job deployment(s) confirmed")
        elif args.command == "notify":
            from .locking import WorkerLock
            from .notifications import flush
            with WorkerLock(store.state):
                if args.retry_failed:
                    with store.connect() as db:
                        db.execute("UPDATE outbox SET attempts=0,due=0,last_error=NULL WHERE sent IS NULL")
                print(f"{flush(store)} notification(s) delivered; unset webhook means no delivery")
        return 0
    except KeyboardInterrupt:
        print("Stopped", file=sys.stderr)
        return 130
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
