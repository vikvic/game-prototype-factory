from prototype_factory.cli import main
import sys

if __name__ == "__main__":
    # Windows redirected output otherwise inherits a legacy ANSI encoding.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    raise SystemExit(main())
