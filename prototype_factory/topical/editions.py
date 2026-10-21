import hashlib
import html
import json
import re
import shutil
import subprocess
import uuid
from pathlib import Path, PurePosixPath

from ..config import executable
from ..export import linked
from ..locking import WorkerLock
from ..runner import run_process
from .config import load
from .research import digest, require_current, require_editorial_review
from .store import identifier, now

GAME = "paparazzi-escape"


def validate(data):
    allowed = {"id", "opportunity", "game", "title", "subject", "subtitle", "description", "accent", "background", "outfit", "setting", "result_win", "result_loss", "preview", "difficulty", "theme", "notice", "mechanic"}
    if not isinstance(data, dict) or set(data) - allowed:
        raise ValueError("Edition contains unsupported fields")
    for key in ("id", "opportunity"):
        identifier(data.get(key))
    if data.get("game") != GAME:
        raise ValueError("Only paparazzi-escape is supported in this pilot")
    for key in ("title", "subject", "subtitle", "description", "setting", "result_win", "result_loss"):
        if not isinstance(data.get(key), str) or not 1 <= len(data[key]) <= (500 if key == "description" else 160):
            raise ValueError(f"Invalid edition {key}")
    for key in ("accent", "background", "outfit"):
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", data.get(key, "")):
            raise ValueError(f"{key} must be a six-digit hex color")
    if data.get("difficulty") not in ("easy", "normal", "hard") or not isinstance(data.get("preview"), bool):
        raise ValueError("Edition needs difficulty easy/normal/hard and boolean preview")
    if data.get("theme", "classic") not in ("classic", "runway"):
        raise ValueError("Edition theme must be classic or runway")
    if data.get("mechanic", "camera-escape") not in ("camera-escape", "wing-escape"):
        raise ValueError("Edition mechanic must be camera-escape or wing-escape")
    if "notice" in data and (not isinstance(data["notice"], str) or not 1 <= len(data["notice"]) <= 160):
        raise ValueError("Edition notice must contain 1–160 characters")
    return data


def git(root, *args):
    result = subprocess.run([executable("git"), "-C", str(root), *args], capture_output=True, timeout=30)
    if result.returncode:
        raise ValueError("Cannot read pinned Git source: " + result.stderr.decode(errors="replace")[:500])
    return result.stdout


def hash_tree(folder):
    if linked(folder) or not folder.is_dir():
        raise ValueError("Expected a real artifact directory")
    hasher = hashlib.sha256()
    for path in sorted(folder.rglob("*")):
        if linked(path):
            raise ValueError("Artifact may not contain links")
        if path.is_file():
            relative = path.relative_to(folder).as_posix()
            hasher.update(relative.encode() + b"\0" + hashlib.sha256(path.read_bytes()).digest())
    return hasher.hexdigest()


def queue(root, store, path):
    data = validate(json.loads(path.read_text(encoding="utf-8-sig")))
    opportunity = require_current(store, data["opportunity"])
    if not data["preview"]:
        require_editorial_review(opportunity)
    revision = git(root, "rev-parse", "HEAD").decode().strip()
    snapshot = {"edition": data, "research": opportunity, "revision": revision, "config": load(root)}
    fingerprint = digest(snapshot)
    for existing in store.releases():
        if existing["fingerprint"] == fingerprint and existing["status"] not in ("failed", "interrupted", "retired"):
            return existing["id"]
    key = data["id"][:44] + "-" + uuid.uuid4().hex[:8]
    with store.connect() as db:
        db.execute("INSERT INTO releases VALUES(?,?,?,?,?,?,?,?)", (key, data["id"], data["opportunity"], "queued", fingerprint, json.dumps(snapshot), now(), now()))
    store.event(key, "queued", "Pinned edition/research/config and game commit; no model call")
    return key


def copy_game(root, revision, target):
    prefix = f"reusable_games/{GAME}/"
    listing = git(root, "ls-tree", "-r", "-z", revision, "--", prefix).split(b"\0")
    files = []
    for row in listing:
        if not row:
            continue
        meta, name = row.split(b"\t", 1)
        mode, kind, _ = meta.split()
        name = name.decode()
        relative = PurePosixPath(name.removeprefix(prefix))
        if mode not in (b"100644", b"100755") or kind != b"blob" or not name.startswith(prefix) or relative.is_absolute() or ".." in relative.parts or ":" in str(relative) or "\\" in str(relative):
            raise ValueError("Invalid pinned game source")
        files.append((name, relative))
    if not files:
        raise ValueError("Reusable game must be committed before queuing an edition")
    target.mkdir(parents=True)
    for name, relative in files:
        path = target.joinpath(*relative.parts)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(git(root, "show", f"{revision}:{name}"))


def work(root, store, once=True):
    with WorkerLock(store.state):
        abandoned = [r['id'] for r in store.releases() if r['status'] in ('assembling', 'verifying')]
        if abandoned:
            raise ValueError('Unresolved abandoned work; run topical recover before starting: ' + ', '.join(abandoned))
        while True:
            with store.connect() as db:
                db.execute("BEGIN IMMEDIATE")
                row = db.execute("SELECT id FROM releases WHERE status='queued' ORDER BY created,id LIMIT 1").fetchone()
                if not row:
                    return
                key = row[0]
                db.execute("UPDATE releases SET status='assembling',updated=? WHERE id=?", (now(), key))
            release = store.release(key)
            data = release["data"]
            folder = store.state / "releases" / key
            try:
                current = require_current(store, release["opportunity"])
                if not data["edition"]["preview"]:
                    require_editorial_review(current)
                    if digest(current) != digest(data["research"]):
                        raise ValueError("Research changed after queueing; queue a fresh release")
                folder.mkdir(parents=True, exist_ok=False)
                (folder / "snapshot.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
                project = folder / "project"
                copy_game(root, data["revision"], project)
                public = project / "public"
                public.mkdir(exist_ok=True)
                runtime = data["edition"] | {"release": key, "brand": data["config"]["site"]["name"], "analytics_domain": "", "ad_mode": "disabled"}
                (public / "edition.json").write_text(json.dumps(runtime), encoding="utf-8")
                document = project / "index.html"
                markup = document.read_text(encoding="utf-8")
                markup = re.sub(r'<title>.*?</title>', '<title>' + html.escape(runtime['title'] + ' · ' + runtime['brand']) + '</title>', markup)
                markup = re.sub(r'<meta name="description"[^>]*>', '<meta name="description" content="' + html.escape(runtime['description'], quote=True) + '">', markup)
                if not runtime['preview']:
                    markup = markup.replace('content="noindex"', 'content="index,follow"')
                origin = data['config']['site']['url'].rstrip('/')
                metadata = '<meta property="og:title" content="'+html.escape(runtime['title'], quote=True)+'"><meta property="og:description" content="'+html.escape(runtime['subtitle'], quote=True)+'">'
                if origin:
                    metadata += '<link rel="canonical" href="'+html.escape(origin+'/games/'+runtime['id']+'/', quote=True)+'">'
                document.write_text(markup.replace('</head>', metadata+'</head>'), encoding='utf-8')
                settings = data["config"]["build"]
                run_process([executable("npm"), "ci", "--ignore-scripts", "--no-audit", "--no-fund"], project, folder / "install.log", settings["install_timeout_seconds"])
                run_process([executable("npm"), "run", "build"], project, folder / "build.log", settings["build_timeout_seconds"])
                data["artifact"] = hash_tree(project / "dist")
                data["built_at"] = now()
                store.update_release(key, "built", data, {"assembling"})
            except (Exception, KeyboardInterrupt) as error:
                data["error"] = str(error)
                store.update_release(key, "interrupted" if isinstance(error, KeyboardInterrupt) else "failed", data, {"assembling"})
                raise
            print(f"Built {key}; browser/editorial approval pending")
            if once:
                return


def verify(root, store, key):
    with WorkerLock(store.state):
        row = store.release(key)
        if row["status"] not in ("built", "verified"):
            raise ValueError("Only a built release can be verified")
        data = row["data"]
        folder = store.state / "releases" / key
        artifact = folder / "project" / "dist"
        if hash_tree(artifact) != data["artifact"]:
            raise ValueError("Artifact changed since build; queue a fresh edition")
        output = folder / "verification"
        data.pop('verification', None)
        data.pop('approved_at', None)
        data.pop('error', None)
        store.update_release(key, 'verifying', data, {'built', 'verified'})
        try:
            run_process([executable("node"), str(root / "tools" / "check_topical.mjs"), "--dist", str(artifact), "--output", str(output)], root, folder / "verify.log", data["config"]["build"]["verify_timeout_seconds"])
            result = json.loads((output / "result.json").read_text(encoding="utf-8"))
            if not result.get("passed") or result.get("release") != key or hash_tree(artifact) != data["artifact"]:
                raise ValueError("Trusted browser evidence does not match this artifact")
            data["verification"] = {"artifact": data["artifact"], "at": now(), "result_hash": hashlib.sha256((output / "result.json").read_bytes()).hexdigest()}
            store.update_release(key, "verified", data, {'verifying'})
        except (Exception, KeyboardInterrupt) as error:
            data['error'] = str(error) or 'Verification interrupted'
            store.update_release(key, 'built', data, {'verifying'})
            raise


def approve(root, store, key):
    row = store.release(key)
    data = row["data"]
    if row["status"] != "verified":
        raise ValueError("Approval requires passing trusted browser verification")
    if data["edition"]["preview"]:
        raise ValueError("Fictional preview editions cannot receive public editorial approval")
    current = require_current(store, row["opportunity"], review=True)
    require_editorial_review(current)
    if digest(current) != digest(data["research"]) or digest(load(root)) != digest(data["config"]):
        raise ValueError("Research/config changed; queue and verify a fresh release")
    artifact = store.state / "releases" / key / "project" / "dist"
    if hash_tree(artifact) != data["verification"]["artifact"]:
        raise ValueError("Artifact changed after verification")
    result_path = artifact.parent.parent / 'verification' / 'result.json'
    if hashlib.sha256(result_path.read_bytes()).hexdigest() != data['verification']['result_hash']:
        raise ValueError('Browser evidence changed; rerun verification')
    data["approved_at"] = now()
    store.update_release(key, "approved", data, {"verified"})


def recover(store):
    with WorkerLock(store.state):
        with store.connect() as db:
            rows = db.execute("SELECT id FROM releases WHERE status IN ('assembling','verifying')").fetchall()
        for row in rows:
            folder = store.state / "releases" / row[0]
            if (folder / "process.json").exists():
                raise ValueError(f"Process ownership unresolved for {row[0]}; inspect process.json before recovery")
            data = store.release(row[0])["data"] | {"error": "Worker interrupted; queue original edition explicitly"}
            store.update_release(row[0], "interrupted", data, {"assembling", "verifying"})
        return len(rows)
