import math
import shutil
import tomllib
from pathlib import Path

DEFAULTS = {
    "builder": {"provider": "claude", "executable": "claude", "model": "sonnet", "max_budget_usd": 3.0,
                "max_turns": 40, "timeout_seconds": 1200,
                "install_timeout_seconds": 300, "build_timeout_seconds": 180},
    "worker": {"poll_seconds": 10},
    "deploy": {"repository": "", "pages_url": ""},
}


def load(root: Path) -> dict:
    path = root / "factory.toml"
    raw = tomllib.loads(path.read_text(encoding="utf-8-sig")) if path.exists() else {}
    unknown = set(raw) - set(DEFAULTS)
    if unknown:
        raise ValueError(f"Unknown config sections: {', '.join(sorted(unknown))}")
    result = {}
    for section, defaults in DEFAULTS.items():
        supplied = raw.get(section, {})
        if not isinstance(supplied, dict) or set(supplied) - set(defaults):
            raise ValueError(f"Invalid keys in [{section}]")
        result[section] = defaults | supplied
    for key, value in result["builder"].items():
        if key == "provider":
            if not isinstance(value, str) or value not in {"claude", "codex"}:
                raise ValueError("builder.provider must be claude or codex")
        elif key in ("executable", "model"):
            if not isinstance(value, str) or (not value.strip() and not (key == "model" and result["builder"]["provider"] == "codex")):
                raise ValueError(f"builder.{key} must be a nonempty string")
        elif (not isinstance(value, (int, float)) or isinstance(value, bool)
              or not math.isfinite(value) or value <= 0):
            raise ValueError(f"builder.{key} must be positive and finite")
        elif key != "max_budget_usd" and not isinstance(value, int):
            raise ValueError(f"builder.{key} must be an integer")
    poll = result["worker"]["poll_seconds"]
    if isinstance(poll, bool) or not isinstance(poll, (int, float)) or not math.isfinite(poll) or poll < 1:
        raise ValueError("worker.poll_seconds must be at least 1")
    for key, value in result["deploy"].items():
        if not isinstance(value, str):
            raise ValueError(f"deploy.{key} must be a string")
    return result


def executable(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise ValueError(f"Required executable not found: {name}")
    return found
