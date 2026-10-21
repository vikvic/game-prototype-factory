import hashlib
import json
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from .store import identifier, now


def instant(value):
    if not isinstance(value, str):
        raise ValueError("Timestamp must be an ISO string with timezone")
    stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        raise ValueError("Timestamps need a timezone")
    return stamp


def validate(data):
    identifier(data.get("id"))
    for key in ("title", "audience", "hook", "distribution", "evidence", "confidence"):
        if not isinstance(data.get(key), str) or not 1 <= len(data[key]) <= 4000:
            raise ValueError(f"Opportunity requires {key} (1–4000 characters)")
    if data.get("lane") not in ("breaking", "ongoing"):
        raise ValueError("lane must be breaking or ongoing")
    observed = instant(data.get("observed_at"))
    if observed > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError("Observation cannot be in the future")
    if instant(data.get("expires_at")) <= observed:
        raise ValueError("Expiry must follow observation")
    sources = data.get("sources")
    if not isinstance(sources, list) or not 1 <= len(sources) <= 20:
        raise ValueError("Provide 1–20 dated sources")
    for source in sources:
        parsed = urlsplit(source.get("url", ""))
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Source must be an HTTPS URL")
        if not source.get("title") or not source.get("supports"):
            raise ValueError("Each source needs title and the claim it supports")
        instant(source.get("checked_at"))
    if "reviewed_at" in data:
        instant(data["reviewed_at"])
    if "editorial_review" in data:
        validate_editorial_review(data)
    return data


def validate_editorial_review(data):
    review = data.get("editorial_review")
    if not isinstance(review, dict):
        raise ValueError("Public editions need a dated editorial context review in their opportunity")
    if review.get("decision") not in ("eligible", "excluded", "uncertain"):
        raise ValueError("Editorial decision must be eligible, excluded or uncertain")
    if review.get("context") not in ("clear", "recent-death-or-bereavement", "uncertain", "not-person-related"):
        raise ValueError("Editorial review needs an explicit death/bereavement context check")
    for key in ("subjects", "notes"):
        if not isinstance(review.get(key), str) or not 1 <= len(review[key]) <= 2000:
            raise ValueError(f"Editorial review needs {key}")
    stamp = instant(review.get("checked_at"))
    if stamp > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError("Editorial review cannot be in the future")
    urls = review.get("source_urls")
    known = {source["url"] for source in data["sources"]}
    if not isinstance(urls, list) or not 1 <= len(urls) <= 20 or any(not isinstance(url, str) or url not in known for url in urls):
        raise ValueError("Editorial review must cite sources recorded in the opportunity")
    return review


def require_editorial_review(data):
    review = validate_editorial_review(data)
    if review["decision"] != "eligible" or review["context"] not in ("clear", "not-person-related"):
        raise ValueError("Subject excluded or uncertain: " + review["notes"])
    limit = timedelta(hours=2 if data["lane"] == "breaking" else 24)
    if datetime.now(timezone.utc) - instant(review["checked_at"]) > limit:
        raise ValueError("Editorial context review stale; recheck recent deaths/bereavement and current news")
    return review


def import_research(store, path):
    values = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(values, list) or len(values) > 100:
        raise ValueError("Research import must be a list of at most 100 opportunities")
    for value in values:
        validate(value)
    if len({v["id"] for v in values}) != len(values):
        raise ValueError("Duplicate opportunity ID in batch")
    with store.connect() as db:
        for value in values:
            data = json.dumps(value, sort_keys=True)
            previous = db.execute("SELECT data FROM opportunities WHERE id=?", (value["id"],)).fetchone()
            if previous and previous[0] == data:
                continue
            db.execute("INSERT INTO opportunities VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,data=excluded.data,updated=excluded.updated", (value["id"], "researched", data, now()))
    return len(values)


def require_current(store, key, review=False):
    row = store.opportunity(key)
    data = row["data"]
    current = datetime.now(timezone.utc)
    if instant(data["expires_at"]) <= current:
        raise ValueError(f"Opportunity expired: {key}; refresh its evidence explicitly")
    if row["status"] != "selected":
        raise ValueError(f"Opportunity is not selected: {key}")
    if review:
        stamp = instant(data.get("reviewed_at", data["observed_at"]))
        limit = timedelta(hours=2 if data["lane"] == "breaking" else 24)
        if stamp > current + timedelta(minutes=5) or current - stamp > limit:
            raise ValueError("Evidence review stale; recheck sources and import updated research")
    return data


def select(store, key):
    row = store.opportunity(key)
    if instant(row["data"]["expires_at"]) <= datetime.now(timezone.utc):
        raise ValueError("Cannot select an expired opportunity")
    if "editorial_review" in row["data"]:
        require_editorial_review(row["data"])
    with store.connect() as db:
        db.execute("UPDATE opportunities SET status='selected',updated=? WHERE id=?", (now(), key))
    store.event(key, "selected", "Operator selected opportunity; not yet published")


def digest(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
