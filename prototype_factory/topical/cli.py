import argparse
import json
import sqlite3
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .config import load, readiness
from .store import TopicalStore


def main(root, argv=None):
    cli = argparse.ArgumentParser(description="Topical editions; isolated from the legacy prototype queue")
    cli.add_argument("--root", type=Path, default=root)
    subs = cli.add_subparsers(dest="command", required=True)
    for command in ("init", "readiness", "opportunities", "releases", "feed-items", "report", "recover"):
        subs.add_parser(command)
    subs.add_parser("collect")
    for command in ("research", "queue", "accounting"):
        subs.add_parser(command).add_argument("path", type=Path)
    for command in ("select", "show", "verify", "approve", "export", "retire"):
        subs.add_parser(command).add_argument("id")
    subs.add_parser("work").add_argument("--once", action="store_true")
    subs.add_parser("site").add_argument("--preview", action="store_true")
    serve = subs.add_parser("serve")
    serve.add_argument("--port", type=int, default=8766)
    args = cli.parse_args(argv)
    try:
        root = args.root.resolve()
        config = load(root)
        store = TopicalStore(root)
        command = args.command
        if command == "init":
            result = {"database": str(store.path), "legacy_queue": "untouched"}
        elif command == "readiness":
            result = readiness(config)
        elif command == "research":
            from .research import import_research
            result = {"imported": import_research(store, args.path)}
        elif command == "opportunities":
            result = store.opportunities()
        elif command == "select":
            from .research import select
            select(store, args.id)
            result = {"selected": args.id}
        elif command == "collect":
            from .feeds import collect
            result = collect(root, store, config)
        elif command == "feed-items":
            with store.connect() as db:
                result = [dict(row) for row in db.execute("SELECT * FROM feed_items ORDER BY observed DESC LIMIT 100")]
        elif command == "queue":
            from .editions import queue
            result = {"queued": queue(root, store, args.path)}
        elif command == "work":
            from .editions import work
            work(root, store, args.once)
            return 0
        elif command in ("verify", "approve", "recover"):
            from . import editions
            operation = getattr(editions, command)
            result = operation(store) if command == "recover" else operation(root, store, args.id)
        elif command == "export":
            from .site import export_release
            result = {"exported_locally": str(export_release(root, store, args.id)), "deployed": False}
        elif command == "releases":
            result = [{k: row[k] for k in ("id", "edition", "status", "created")} for row in store.releases()]
        elif command == "show":
            result = store.release(args.id)
        elif command == "retire":
            row = store.release(args.id)
            store.update_release(args.id, "retired", row["data"])
            result = {"retired_locally": args.id, "note": "Remove exported artifact and redeploy to retire a public release"}
        elif command == "site":
            from .site import build_site
            result = {"site": str(build_site(root, store, args.preview)), "deployed": False}
        elif command == "serve":
            folder = root / "commercial-preview"
            if not (folder / "index.html").exists():
                raise ValueError("Run topical site --preview first")
            handler = functools.partial(SimpleHTTPRequestHandler, directory=str(folder))
            with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
                print(f"Local commercial preview: http://127.0.0.1:{args.port}", flush=True)
                server.serve_forever()
            return 0
        elif command == "accounting":
            from .accounting import import_rows
            result = {"imported": import_rows(store, args.path)}
        else:
            from .accounting import report
            result = report(store)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except (ValueError, OSError, KeyError, TypeError, sqlite3.Error) as error:
        print(f"Topical factory: {error}")
        return 1
    except KeyboardInterrupt:
        print("Stopped; snapshots and completed releases preserved")
        return 130
