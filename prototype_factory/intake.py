import hashlib
import re
from pathlib import Path

KEY = re.compile(r"[a-z0-9][a-z0-9-]{0,47}\Z")


def parse(path: Path) -> dict:
    text = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    metadata = {}
    body = text
    if text.startswith("---\n"):
        lines = text.splitlines()
        try:
            end = lines.index("---", 1)
        except ValueError:
            raise ValueError(f"{path.name}: unclosed front matter") from None
        for line in lines[1:end]:
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            name, colon, value = line.partition(":")
            name, value = name.strip(), value.strip()
            if not colon or name not in {"id", "title", "template", "priority", "enabled"} or name in metadata:
                raise ValueError(f"{path.name}: invalid or duplicate metadata field: {name}")
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            metadata[name] = value
        body = "\n".join(lines[end + 1:]).strip()
    key = metadata.get("id", path.stem)
    if not KEY.fullmatch(key):
        raise ValueError(f"{path.name}: id must be 1-48 lowercase letters, digits or hyphens")
    template = metadata.get("template", "canvas")
    if template not in {"canvas", "three"}:
        raise ValueError(f"{path.name}: template must be canvas or three")
    enabled = metadata.get("enabled", "true").lower()
    if enabled not in {"true", "false"}:
        raise ValueError(f"{path.name}: enabled must be true or false")
    try:
        priority = int(metadata.get("priority", "0"))
        if not -100 <= priority <= 100:
            raise ValueError()
    except ValueError:
        raise ValueError(f"{path.name}: priority must be an integer from -100 to 100") from None
    title = metadata.get("title") or next((line.lstrip("# ") for line in body.splitlines() if line.strip()), key)
    if not body.strip() or not title.strip() or len(title) > 200:
        raise ValueError(f"{path.name}: nonempty body and title (up to 200 characters) required")
    return {"idea_key": key, "title": title, "template": template, "priority": priority,
            "enabled": enabled == "true", "body": body, "source": str(path.resolve()),
            "digest": hashlib.sha256(text.encode()).hexdigest()}


def read_batch(paths: list[Path]) -> list[dict]:
    files = set()
    for path in paths:
        if not path.exists():
            raise ValueError(f"Intake path does not exist: {path}")
        files.update(path.rglob("*.md") if path.is_dir() else [path])
    ideas, ids = [], set()
    for path in sorted(files):
        if path.name.lower() == "readme.md":
            continue
        if path.is_symlink():
            raise ValueError(f"Intake symlinks are not supported: {path}")
        idea = parse(path)
        if idea["idea_key"] in ids:
            raise ValueError(f"Duplicate idea id in intake batch: {idea['idea_key']}")
        ids.add(idea["idea_key"])
        if idea["enabled"]:
            ideas.append(idea)
    return ideas
