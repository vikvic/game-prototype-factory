import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from prototype_factory.export import build_site

if __name__ == "__main__":
    print(build_site(ROOT))
