import html
import json
import shutil
from pathlib import Path

from .config import load, readiness
from .editions import hash_tree
from .research import digest, require_current
from .store import now


def export_release(root, store, key):
    row = store.release(key)
    data = row["data"]
    if row["status"] != "approved":
        raise ValueError("Public export requires editorial approval")
    research = require_current(store, row["opportunity"], review=True)
    if digest(research) != digest(data["research"]) or digest(load(root)) != digest(data["config"]):
        raise ValueError("Release inputs changed after approval")
    source = store.state / "releases" / key / "project" / "dist"
    if hash_tree(source) != data["artifact"]:
        raise ValueError("Artifact changed after approval")
    destination = root / "topical_releases" / key
    if destination.exists():
        raise ValueError("Export already exists; historical releases cannot be overwritten")
    destination.mkdir(parents=True)
    shutil.copytree(source, destination / "game")
    public = {"id": key, "edition": data["edition"], "revision": data["revision"], "artifact": data["artifact"], "approved_at": data["approved_at"], "expires_at": research["expires_at"], "verification": data["verification"], "exported_at": now()}
    (destination / "release.json").write_text(json.dumps(public, indent=2), encoding="utf-8")
    store.event(key, "exported", "Verified public artifact exported locally; not deployed")
    return destination


def build_site(root, store=None, preview=False):
    config = load(root)
    target = root / ("commercial-preview" if preview else "commercial-dist")
    # Only fixed, dedicated output folders are replaced. Never legacy dist/prototypes.
    if target.is_symlink() or getattr(target, "is_junction", lambda: False)():
        raise ValueError("Output cannot be a link")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir()
    releases = []
    if preview:
        if store is None:
            raise ValueError("Preview needs local store")
        seen = set()
        for row in store.releases():
            if row["status"] not in ("verified", "approved") or row["edition"] in seen:
                continue
            seen.add(row["edition"])
            data = row["data"]
            source = store.state / "releases" / row["id"] / "project" / "dist"
            releases.append(({"id": row["id"], "edition": data["edition"], "revision": data["revision"], "artifact": data["artifact"]}, source))
    else:
        from .research import instant
        from datetime import datetime, timezone
        newest = {}
        for metadata in sorted((root / "topical_releases").glob("*/release.json")):
            data = json.loads(metadata.read_text(encoding="utf-8"))
            if instant(data["expires_at"]) <= datetime.now(timezone.utc):
                continue
            edition = data["edition"]
            if edition["preview"] or not data.get("approved_at"):
                raise ValueError("Unapproved/preview artifact in public exports")
            old = newest.get(edition["id"])
            if old is None or data["approved_at"] > old[0]["approved_at"]:
                newest[edition["id"]] = (data, metadata.parent / "game")
        releases = list(newest.values())
        if not releases:
            raise ValueError("No unexpired approved public releases; use site --preview for fictional editions")
        if not config["site"]["url"] or not config["site"]["contact_email"]:
            raise ValueError("Public site requires domain/contact in commercial.toml")
    cards, manifest = [], []
    for data, source in releases:
        if hash_tree(source) != data["artifact"]:
            raise ValueError("Export fingerprint mismatch")
        edition = data["edition"]
        slug = edition["id"]
        shutil.copytree(source, target / "games" / slug)
        cards.append(f'<a class="card" href="./games/{html.escape(slug)}/"><span>{html.escape(edition["setting"])}</span><h2>{html.escape(edition["title"])}</h2><p>{html.escape(edition["subtitle"])}</p><strong>Make an entrance ↗</strong></a>')
        manifest.append({"release": data["id"], "edition": slug, "artifact": data["artifact"], "revision": data["revision"]})
    brand = html.escape(config["site"]["name"])
    robots = 'noindex,nofollow' if preview else 'index,follow'
    label = 'LOCAL PREVIEW · FICTIONAL EDITIONS · ADS OFF' if preview else 'TINY GAMES. BIG MOMENTS.'
    style = 'body{margin:0;background:#10141b;color:#fff5e4;font:17px system-ui}main{max-width:1050px;margin:7vh auto;padding:24px}small,span{color:#ffc873;font-size:12px;letter-spacing:.1em}h1{font-size:clamp(42px,8vw,80px);line-height:1.05;margin:20px 0}p{color:#adb8c9;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;margin-top:40px}.card{display:block;background:#202936;border:1px solid #4c5665;border-radius:20px;padding:28px;color:inherit;text-decoration:none}.card:hover{border-color:#ffc873}strong{color:#ffc873;font-size:14px}footer{margin-top:40px}a{color:#ffc873}'
    (target / "index.html").write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="{robots}"><title>{brand}</title><style>{style}</style><main><small>{label}</small><h1>Five minutes.<br>One ridiculous escape.</h1><p>Pick a moment. Dodge the cameras. Leave with a story.</p><div class="grid">{"".join(cards)}</div><footer><a href="./privacy.html">Privacy</a> · <a href="./contact.html">Contact</a></footer></main></html>', encoding="utf-8")
    privacy = 'These previews use no ads, tracking scripts, player accounts or friend permissions. Sharing happens only when you choose it. Local session storage remembers whether a single ad opportunity was offered; it does not identify you. Hosting may retain ordinary security logs.'
    contact = html.escape(config["site"]["contact_email"]) or 'Contact is not configured. This is a local preview and is not ready for commercial publication.'
    for name, text in (("privacy", privacy), ("contact", contact)):
        (target / f"{name}.html").write_text(f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name.title()} · {brand}</title><style>{style}</style><main><a href="./">← Games</a><h1>{name.title()}</h1><p>{text}</p></main></html>', encoding="utf-8")
    origin = config["site"]["url"].rstrip('/')
    urls = [f'{origin}/'] + [f'{origin}/games/{item["edition"]}/' for item in manifest]
    (target / "sitemap.xml").write_text('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{html.escape(u)}</loc></url>' for u in urls)+'</urlset>', encoding="utf-8")
    (target / "robots.txt").write_text('User-agent: *\nDisallow: /\n' if preview else f'User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n', encoding="utf-8")
    (target / "_headers").write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n', encoding="utf-8")
    (target / "manifest.json").write_text(json.dumps({"built_at": now(), "preview": preview, "readiness": readiness(config), "releases": manifest}, indent=2), encoding="utf-8")
    return target
