import sys
import json
import shutil
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from prototype_factory.export import JOB_ID, build_site, linked


def snapshot_hash(folder, entries):
    """Use the original manifest order; native Path ordering varies by OS."""
    if linked(folder) or not folder.is_dir() or not isinstance(entries, list) or not entries:
        raise ValueError("Pages preview needs a real game folder and file manifest")
    actual = {}
    for path in folder.rglob("*"):
        if linked(path):
            raise ValueError("Pages preview files cannot be links")
        if path.is_file():
            actual[path.relative_to(folder).as_posix()] = path
    fingerprint, seen = sha256(), set()
    for entry in entries:
        name = entry["path"]
        if name in seen or name not in actual:
            raise ValueError("Pages preview contains duplicate or missing files")
        seen.add(name)
        checksum = sha256(actual[name].read_bytes()).digest()
        if checksum.hex() != entry["sha256"]:
            raise ValueError("Pages preview file differs from the verified snapshot")
        fingerprint.update(name.encode() + b"\0" + checksum)
    if seen != set(actual):
        raise ValueError("Pages preview contains unrecorded files")
    return fingerprint.hexdigest()


def add_public_tests(output):
    """Copy explicit, fingerprinted test snapshots without rebuilding their game code."""
    previews = ROOT / "pages-previews"
    if not previews.exists():
        return
    if linked(previews):
        raise ValueError("Pages preview root must not be a link")
    published = []
    for folder in sorted(previews.iterdir()):
        if not folder.is_dir():
            continue
        if linked(folder) or not JOB_ID.fullmatch(folder.name):
            raise ValueError("Invalid Pages preview folder")
        metadata = json.loads((folder / "release.json").read_text(encoding="utf-8"))
        if metadata.get("purpose") != "public-test" or metadata.get("slug") != folder.name:
            raise ValueError("Pages preview requires an explicit public-test manifest")
        evidence = (folder / "verification.json").read_bytes()
        verified = json.loads(evidence)
        if sha256(evidence).hexdigest() != metadata.get("verification_result_hash") or not verified.get("passed") or verified.get("release") != metadata.get("release"):
            raise ValueError("Pages preview verification record does not match its manifest")
        game = folder / "game"
        if snapshot_hash(game, metadata.get("artifact_files")) != metadata.get("artifact"):
            raise ValueError("Pages preview differs from its verified artifact")
        runtime = json.loads((game / "edition.json").read_text(encoding="utf-8"))
        if runtime.get("release") != metadata.get("release") or runtime.get("ad_mode") != "disabled" or runtime.get("analytics_domain"):
            raise ValueError("Public tests must match their release and disable ads/analytics")
        destination = output / "testing" / folder.name
        destination.parent.mkdir(exist_ok=True)
        shutil.copytree(game, destination)
        if snapshot_hash(destination, metadata["artifact_files"]) != metadata["artifact"]:
            raise ValueError("Copied Pages preview fingerprint mismatch")
        published.append(metadata)
    if published:
        (output / "testing" / "manifest.json").write_text(json.dumps(published, indent=2), encoding="utf-8")

if __name__ == "__main__":
    site = build_site(ROOT)
    add_public_tests(site)
    print(site)
