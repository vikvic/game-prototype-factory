"""Factory-owned browser acceptance; candidate code cannot choose its scenario."""
import hashlib
import json
import subprocess
from pathlib import Path

from .config import executable
from .export import ROOT_FILES, SOURCE_DIRS, linked

TOOL_ROOT = Path(__file__).resolve().parent.parent
KNOWN_GAMES = {"buffet-dash-24812a73", "tunnel-frontier-e2df699d", "canvas-starter", "three-starter"}


class MissingCoverage(ValueError):
    """No trusted core-loop scenario exists for this game."""


def project_fingerprint(project: Path) -> str:
    project = Path(project).absolute()
    if linked(project) or not project.is_dir():
        raise ValueError(f"Expected an unlinked project directory: {project}")
    paths = [project / name for name in ROOT_FILES if (project / name).exists() or (project / name).is_symlink()]
    for name in SOURCE_DIRS:
        directory = project / name
        if linked(directory):
            raise ValueError(f"Linked source path is forbidden: {directory}")
        if directory.is_dir():
            paths.extend(directory.rglob("*"))
    selected = []
    for path in paths:
        if linked(path) or not path.resolve().is_relative_to(project.resolve()):
            raise ValueError(f"Linked source path is forbidden: {path}")
        relative = path.relative_to(project)
        if any(part.startswith(".") and part != ".gitignore" for part in relative.parts):
            continue
        if path.is_file():
            selected.append((relative.as_posix(), path))
    digest = hashlib.sha256()
    for relative, path in sorted(selected):
        digest.update(relative.encode("utf-8") + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()


def verify_game(project: Path, game_id: str, evidence: Path, timeout: int = 300) -> dict:
    """Verify a freshly built, quiescent candidate with trusted browser tooling.

    The coordinator must freeze builder writes, fingerprint source, run the strict
    production build with its frozen toolchain, and check unchanged source before
    calling. This stage owns browser/server processes, not the preceding build.
    """
    # Resolve tooling from this installed factory, never from the candidate/store root.
    from .runner import run_process
    evidence = Path(evidence).absolute()
    evidence.mkdir(parents=True, exist_ok=True)
    result_path = evidence / "result.json"
    result_path.unlink(missing_ok=True)
    if game_id not in KNOWN_GAMES:
        result = {"passed": False, "game": game_id, "emulated": True, "missing_coverage": True,
                  "failure": f"No trusted gameplay scenario registered for {game_id}"}
        result_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        raise MissingCoverage(f"{result['failure']}; evidence: {result_path}")
    fingerprint = None
    build_fingerprint = None
    try:
        if timeout <= 0:
            raise ValueError("Browser timeout must be positive")
        fingerprint = project_fingerprint(project)
        build_fingerprint = _dist_fingerprint(Path(project))
        run_process([executable("node"), str(TOOL_ROOT / "tools" / "playcheck.mjs"),
                     "--project", str(Path(project).absolute()), "--game", game_id,
                     "--output", str(evidence), "--timeout", str(timeout)],
                    TOOL_ROOT, evidence / "browser.log", timeout)
        result = json.loads(result_path.read_text(encoding="utf-8"))
        if not result.get("passed") or result.get("game") != game_id:
            raise ValueError("Browser verifier did not return a passing result for this game")
        if project_fingerprint(project) != fingerprint:
            raise ValueError("Candidate source changed during browser verification")
        if _dist_fingerprint(Path(project)) != build_fingerprint:
            raise ValueError("Built artifacts changed during browser verification")
        result["source_fingerprint"] = fingerprint
        result["build_fingerprint"] = build_fingerprint
        result_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result
    except (ValueError, subprocess.TimeoutExpired, OSError) as error:
        try:
            result = json.loads(result_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            result = {"game": game_id, "emulated": True}
        result.update(passed=False, failure=result.get("failure") or str(error), wrapper_failure=str(error), source_fingerprint=fingerprint, build_fingerprint=build_fingerprint)
        result_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        raise ValueError(f"Browser verification failed: {error}; evidence: {result_path}") from error


def _dist_fingerprint(project: Path) -> str:
    dist = project.absolute() / "dist"
    if linked(dist) or not (dist / "index.html").is_file():
        raise ValueError("Expected an unlinked production dist with index.html")
    digest = hashlib.sha256()
    for path in sorted(dist.rglob("*")):
        if linked(path):
            raise ValueError(f"Linked build artifact is forbidden: {path}")
        if path.is_file():
            digest.update(path.relative_to(dist).as_posix().encode("utf-8") + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()
