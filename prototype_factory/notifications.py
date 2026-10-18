import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

WEBHOOK_PATH = re.compile(r"/api(?:/v\d+)?/webhooks/\d+/[A-Za-z0-9_.-]+\Z")


def payload(content: str) -> bytes:
    return json.dumps({"content": content[:1900], "allowed_mentions": {"parse": []}}).encode("utf-8")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def send(content: str, webhook: str):
    parsed = urllib.parse.urlsplit(webhook)
    if parsed.scheme != "https" or parsed.hostname not in {"discord.com", "canary.discord.com", "ptb.discord.com"} or not WEBHOOK_PATH.fullmatch(parsed.path) or parsed.username or parsed.password or parsed.port:
        raise ValueError("DISCORD_WEBHOOK_URL must be an official Discord HTTPS webhook URL")
    query = dict(urllib.parse.parse_qsl(parsed.query))
    query["wait"] = "true"
    url = urllib.parse.urlunsplit(parsed._replace(query=urllib.parse.urlencode(query), fragment=""))
    request = urllib.request.Request(url, data=payload(content), headers={"Content-Type": "application/json", "User-Agent": "PrototypeFactory/1.0"})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=10) as response:
        if response.status not in (200, 204):
            raise ValueError("Discord did not confirm notification delivery")


def flush(store) -> int:
    webhook = os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook:
        return 0
    sent = 0
    with store.connect() as db:
        items = list(db.execute("SELECT * FROM outbox WHERE sent IS NULL AND attempts<5 AND due<=? ORDER BY seq LIMIT 10", (time.time(),)))
    for item in items:
        error, delay = None, min(3600, 30 * (2 ** item["attempts"]))
        try:
            send(item["content"], webhook)
        except urllib.error.HTTPError as failure:
            error = f"Discord HTTP {failure.code}"
            if failure.code == 429:
                try:
                    delay = min(3600, max(1, float(failure.headers.get("Retry-After", delay))))
                except ValueError:
                    pass
        except Exception:
            error = "Discord delivery failed; check webhook configuration and network"
        with store.connect() as db:
            db.execute("UPDATE outbox SET attempts=attempts+1,due=?,sent=?,last_error=? WHERE seq=?",
                       (time.time() + delay, None if error else datetime.now(timezone.utc).isoformat(), error, item["seq"]))
        sent += error is None
    return sent
