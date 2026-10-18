"""CI-only webhook sender. Read the URL from repository secrets, never an argument."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prototype_factory.notifications import send

if __name__ == "__main__":
    webhook = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook:
        print("Discord not configured; skipped")
        raise SystemExit(0)
    success = os.environ.get("DEPLOY_RESULT") == "success"
    status = "deployed" if success else "deployment did not complete successfully"
    repo = os.environ["GITHUB_REPOSITORY"]
    run = os.environ["GITHUB_RUN_ID"]
    url = os.environ.get("PAGE_URL", "")
    content = f"Prototype Arcade: {status}\nhttps://github.com/{repo}/actions/runs/{run}"
    if success and url:
        content += f"\nPlay: {url}"
    try:
        send(content, webhook)
    except Exception:
        print("Discord notification failed; check the repository secret and network. No webhook URL logged.", file=sys.stderr)
        raise SystemExit(1)
