"""Build only previously approved, fingerprint-matched public artifacts."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prototype_factory.topical.site import build_site

if __name__ == "__main__":
    print(build_site(Path(__file__).resolve().parents[1]))
