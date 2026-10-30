import argparse
import json
import sqlite3
import sys
from pathlib import Path

from . import auth, campaigns
from .client import Client, identifier
from .store import Store


def parser(root):
    cli = argparse.ArgumentParser(description="Advertising adapters: targeting discovery and paused campaign containers only")
    platforms = cli.add_subparsers(dest="platform", required=True)
    reddit = platforms.add_parser("reddit", help="Reddit Ads API v3; never activates ads")
    reddit.add_argument("--root", type=Path, default=root)
    subs = reddit.add_subparsers(dest="command", required=True)
    setup = subs.add_parser("setup", help="Save only the public app ID locally and show the registered callback URL")
    setup.add_argument("--client-id", required=True)
    for name in ("doctor", "check", "accounts", "drafts", "forget"):
        subs.add_parser(name)
    connect = subs.add_parser("connect", help="Prompt for the app secret locally and authorize adsread/adsedit")
    connect.add_argument("--client-id")
    targets = subs.add_parser("targets", help="Query eligible targeting; no content scraping or posting")
    targets.add_argument("kind", choices=("communities", "interests", "geolocations"))
    targets.add_argument("query")
    draft = subs.add_parser("draft", help="Snapshot a brief locally; no remote request")
    draft.add_argument("path", type=Path)
    draft.add_argument("--account", default="", help="Bind this immutable draft to an ad account ID from accounts")
    for name in ("show", "send", "sync"):
        sub = subs.add_parser(name, help={"show": "Review the stored local brief and exact remote payload",
                                        "send": "Create only a PAUSED campaign container; no ad groups/ads",
                                        "sync": "Read/reconcile an interrupted attempt and confirm it remains paused"}[name])
        sub.add_argument("id")
    return cli


def main(root, argv=None):
    args = parser(root).parse_args(argv)
    try:
        root = args.root.resolve()
        if not root.is_dir():
            raise ValueError("Factory root does not exist.")
        command = args.command
        if command == "setup":
            identifier(args.client_id)
            folder = auth.state_dir(root)
            folder.mkdir(parents=True, exist_ok=True)
            (folder / "app.json").write_text(json.dumps({"client_id": args.client_id}), encoding="utf-8")
            result = {"app_id_saved": True, "redirect_uri": auth.REDIRECT_URI,
                      "next": "Register this exact redirect URI in the Reddit app, then run ads reddit connect.",
                      "spending_enabled": False}
        elif command == "doctor":
            result = auth.readiness(root)
            result["app_id_configured"] = (auth.state_dir(root) / "app.json").is_file()
        elif command == "connect":
            client_id = args.client_id
            config = auth.state_dir(root) / "app.json"
            if not client_id and config.is_file():
                if config.stat().st_size > 4096:
                    raise ValueError("Public app configuration is unexpectedly large.")
                client_id = json.loads(config.read_text(encoding="utf-8-sig")).get("client_id")
            if client_id:
                identifier(client_id)
            result = auth.connect(root, client_id)
        elif command == "forget":
            (auth.state_dir(root) / "credentials.dpapi").unlink(missing_ok=True)
            result = {"local_saved_credentials_removed": True,
                      "note": "Revoke the app on Reddit to revoke remote access. Environment credentials, if set, remain active."}
        elif command in ("check", "accounts"):
            client = Client(root)
            businesses = client.businesses()
            result = {"authorization_verified": True, "scopes": sorted(client.scopes), "businesses": [], "spending_enabled": False}
            for business in businesses:
                entry = {key: business.get(key) for key in ("id", "name", "country")}
                if command == "accounts":
                    entry["accounts"] = [{key: account.get(key) for key in ("id", "name", "currency", "type", "admin_approval")}
                                         for account in client.accounts(business["id"])]
                result["businesses"].append(entry)
        elif command == "targets":
            query = campaigns.text(args.query, "targeting query", 100)
            if args.kind == "geolocations":
                query = query.upper()
            rows = Client(root).targeting(args.kind, query)
            result = Store(root).targeting(args.kind, query, rows)
            result["note"] = "Discovery evidence only; not applied to any ad group. Availability can change."
        else:
            store = Store(root)
            if command == "draft":
                result = campaigns.preview(campaigns.draft(root, store, args.path, args.account))
            elif command == "drafts":
                result = store.rows()
            elif command == "show":
                result = campaigns.preview(store.get(args.id))
            elif command == "send":
                result = campaigns.send(store, args.id, Client(root))
            else:
                result = campaigns.sync(store, args.id, Client(root))
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except KeyboardInterrupt:
        print("Stopped. If a send was interrupted, run sync before trying again.", file=sys.stderr)
        return 130
    except (ValueError, OSError, sqlite3.Error, EOFError) as error:
        print(f"Reddit Ads: {error}", file=sys.stderr)
        return 1
    except (KeyError, TypeError):
        print("Reddit Ads: unexpected response/configuration shape. Inspect the local draft and reconnect if needed.", file=sys.stderr)
        return 1
