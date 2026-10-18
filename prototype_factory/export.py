import html
import json
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from .config import executable

ROOT_FILES = {"index.html", "package.json", "package-lock.json", "tsconfig.json",
              "vite.config.ts", "PROTOTYPE.md", "prototype.json", ".gitignore"}
SOURCE_DIRS = {"src", "public"}
JOB_ID = re.compile(r"[a-z0-9][a-z0-9-]{0,63}\Z")


def linked(path: Path) -> bool:
    return path.is_symlink() or bool(getattr(path, "is_junction", lambda: False)()) or (path.exists() and path.resolve() != path.absolute())


def copy_source(source: Path, destination: Path):
    """Export only web project inputs. Never copy logs, .git, .env or intake."""
    if destination.exists():
        raise ValueError(f"Destination already exists: {destination}")
    if linked(source) or not source.is_dir():
        raise ValueError(f"Expected a real project directory: {source}")
    selected = []
    candidates = [source / name for name in ROOT_FILES if (source / name).exists()]
    for name in SOURCE_DIRS:
        directory = source / name
        if linked(directory):
            raise ValueError(f"Source symlinks are not supported: {name}")
        if directory.is_dir():
            candidates.extend(directory.rglob("*"))
    for path in candidates:
        relative = path.relative_to(source)
        if relative.parts[0] not in ROOT_FILES | SOURCE_DIRS:
            continue
        if linked(path) or not path.resolve().is_relative_to(source.resolve()):
            raise ValueError(f"Source symlinks are not supported: {relative}")
        if any(part.startswith(".") and part != ".gitignore" for part in relative.parts):
            continue
        if path.is_file():
            selected.append((path, relative))
    if not all((source / name).is_file() for name in ("package.json", "package-lock.json", "index.html")):
        raise ValueError("Project must include index.html, package.json and package-lock.json")
    destination.mkdir(parents=True)
    for path, relative in selected:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def publish(store, job_id: str) -> Path:
    job = store.get(job_id)
    if job["status"] not in {"ready", "demo_ready"}:
        raise ValueError("Only ready or demo_ready jobs can be exported")
    destination = store.root / "prototypes" / job_id
    copy_source(Path(job["folder"]), destination)
    store.update(job_id, published=str(destination), phase="exported")
    with store.connect() as db:
        store.event(db, job_id, "exported", "Source exported for GitHub deployment; not deployed yet", notify=True)
    return destination


def game_metadata(folder: Path) -> dict:
    if linked(folder) or not JOB_ID.fullmatch(folder.name):
        raise ValueError(f"Invalid prototype folder: {folder.name}")
    metadata = json.loads((folder / "prototype.json").read_text(encoding="utf-8"))
    if metadata.get("id") != folder.name or not isinstance(metadata.get("title"), str) or not isinstance(metadata.get("demo"), bool):
        raise ValueError(f"Invalid prototype.json in {folder.name}")
    return metadata


def build_site(root: Path):
    from .runner import run_process
    root = root.resolve()
    state = root / ".factory"
    state.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="gallery-", dir=state) as working:
        stage = Path(working)
        output = stage / "dist"
        output.mkdir()
        cards, manifest = [], []
        prototypes = root / "prototypes"
        for folder in sorted(prototypes.iterdir()) if prototypes.exists() else []:
            if not folder.is_dir():
                continue
            metadata = game_metadata(folder)
            run_process([executable("npm"), "ci", "--ignore-scripts", "--no-audit", "--no-fund"], folder, stage / f"{folder.name}-install.log", 300)
            target = output / "games" / folder.name
            run_process([executable("npm"), "run", "build", "--", "--outDir", str(target), "--emptyOutDir"], folder, stage / f"{folder.name}-build.log", 180)
            if not (target / "index.html").is_file():
                raise ValueError(f"No build output for {folder.name}")
            label = "Starter demo" if metadata["demo"] else "Prototype — human playtest pending"
            cards.append(f'<a class="card" href="./games/{folder.name}/"><span>{label}</span><h2>{html.escape(metadata["title"])}</h2><p>{html.escape(metadata.get("template", ""))} · Play →</p></a>')
            manifest.append(metadata)
        body = "".join(cards) or '<p class="empty">No prototypes exported yet. Run a job, then export it with the publish command.</p>'
        (output / "index.html").write_text(f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prototype Arcade</title>
<style>body{{margin:0;background:#0d1321;color:#ecf2ff;font:17px system-ui}}main{{max-width:1100px;margin:8vh auto;padding:24px}}small,span{{color:#79dac9;letter-spacing:.08em}}h1{{font-size:clamp(36px,7vw,70px);margin:12px 0}}.intro{{color:#a8b4ca;max-width:600px;line-height:1.6}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-top:48px}}.card{{background:#172238;border:1px solid #2e405e;border-radius:18px;padding:26px;color:inherit;text-decoration:none}}.card:hover,.card:focus-visible{{border-color:#79dac9;transform:translateY(-3px)}}.card span{{font-size:12px}}.card p,.empty{{color:#a8b4ca}}footer{{margin-top:48px;color:#8c9bb3;font-size:14px}}</style>
<main><small>IDEA → PLAY → LEARN</small><h1>Prototype Arcade</h1><p class="intro">Small games. One mechanic at a time. Pick a prototype, play for two minutes, and decide whether the idea deserves another pass.</p><section class="grid">{body}</section><footer>Builds verify compilation. You decide whether the game works.</footer></main></html>''', encoding="utf-8")
        (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        (output / ".nojekyll").touch()
        destination = root / "dist"
        if linked(destination) or destination.resolve().parent != root:
            raise ValueError("Refusing to replace a dist directory outside the repository")
        if destination.exists():
            shutil.rmtree(destination)
        shutil.move(str(output), str(destination))
    return destination


def check_deploy(store, config: dict):
    """Reconcile against the successful deploy job's actual commit and manifest."""
    import subprocess
    repo = config["deploy"]["repository"]
    base = config["deploy"]["pages_url"].rstrip("/")
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo):
        raise ValueError("Set deploy.repository to owner/repository in factory.toml")
    if urlsplit(base).scheme != "https" or not urlsplit(base).hostname:
        raise ValueError("Set deploy.pages_url to the HTTPS URL reported by GitHub Pages")
    gh = executable("gh")
    result = subprocess.run([gh, "run", "list", "--repo", repo, "--workflow", "pages.yml", "--limit", "20",
                             "--json", "databaseId,headSha,conclusion,status,event"], capture_output=True, text=True, check=True, timeout=30)
    runs = [run for run in json.loads(result.stdout) if run["event"] != "pull_request"]
    if not runs or runs[0]["status"] != "completed" or runs[0]["conclusion"] != "success":
        raise ValueError("Latest Pages workflow has not completed successfully; no live links recorded")
    run = runs[0]
    # The workflow also runs on PRs, but only a successful deploy job is authoritative.
    detail = subprocess.run([gh, "api", f"repos/{repo}/actions/runs/{run['databaseId']}/jobs"], capture_output=True, text=True, check=True, timeout=30)
    if not any(job["name"] == "deploy" and job["conclusion"] == "success" for job in json.loads(detail.stdout)["jobs"]):
        raise ValueError("Workflow did not actually deploy Pages")
    manifest_result = subprocess.run([gh, "api", f"repos/{repo}/git/trees/{run['headSha']}?recursive=1"], capture_output=True, text=True, check=True, timeout=30)
    paths = {item["path"] for item in json.loads(manifest_result.stdout)["tree"]}
    recorded = 0
    for job in store.jobs():
        if job["deploy_url"] and f"prototypes/{job['id']}/prototype.json" not in paths:
            store.update(job["id"], deploy_url=None, deploy_sha=None)
        if job["published"] and f"prototypes/{job['id']}/prototype.json" in paths:
            url = f"{base}/games/{job['id']}/"
            if job["deploy_sha"] != run["headSha"]:
                store.update(job["id"], deploy_url=url, deploy_sha=run["headSha"])
                with store.connect() as db:
                    store.event(db, job["id"], "deployed", f"Pages deployment confirmed: {url}", notify=True)
                recorded += 1
    return recorded
