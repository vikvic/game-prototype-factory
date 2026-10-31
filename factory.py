from prototype_factory.cli import main
import sys

if __name__ == "__main__":
    # Windows redirected output otherwise inherits a legacy ANSI encoding.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    if len(sys.argv) > 1 and sys.argv[1] == "topical":
        from pathlib import Path
        from prototype_factory.topical.cli import main as topical_main
        raise SystemExit(topical_main(Path(__file__).resolve().parent, sys.argv[2:]))
    raise SystemExit(main())
