"""Immutable local briefs and explicit paused-only remote campaign drafts."""
import hashlib
import json
import re
import uuid
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .client import identifier
from .http import ApiError
from .store import now


def text(value, name, maximum):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum or any(ord(c) < 32 for c in value):
        raise ValueError(f"{name} must be nonempty plain text, at most {maximum} characters.")
    return value.strip()


def validate_brief(root, path):
    path = Path(path)
    if path.stat().st_size > 64 * 1024:
        raise ValueError("Campaign brief exceeds 64 KiB.")
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    keys = {"game", "name", "destination_url", "headline", "body", "audience", "spending_authorized"}
    if not isinstance(data, dict) or set(data) != keys or data["spending_authorized"] is not False:
        raise ValueError("Use the documented brief fields and spending_authorized=false. This adapter cannot buy ads.")
    game = data["game"]
    if not isinstance(game, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", game) or len(game) > 100:
        raise ValueError("game must be a prototype slug.")
    if not (Path(root) / "prototypes" / game / "prototype.json").is_file():
        raise ValueError("The campaign game is not an exported prototype in this factory.")
    for field, maximum in (("name", 120), ("headline", 300), ("body", 2000)):
        data[field] = text(data[field], field, maximum)
    destination = text(data["destination_url"], "destination_url", 2000)
    url = urlsplit(destination)
    if (url.scheme != "https" or not url.hostname or url.username or url.password or url.fragment
            or url.port not in (None, 443) or url.hostname in ("localhost", "127.0.0.1", "::1")):
        raise ValueError("destination_url must be an HTTPS game URL without credentials or a fragment.")
    data["destination_url"] = destination
    audience = data["audience"]
    if not isinstance(audience, dict) or set(audience) != {"country", "community_queries"}:
        raise ValueError("audience requires country and community_queries.")
    if not isinstance(audience["country"], str) or not re.fullmatch("[A-Z]{2}", audience["country"]):
        raise ValueError("country must be a two-letter uppercase country code, e.g. GB.")
    queries = audience["community_queries"]
    if not isinstance(queries, list) or not 1 <= len(queries) <= 8:
        raise ValueError("Provide between one and eight community discovery queries.")
    audience["community_queries"] = list(dict.fromkeys(text(q, "community query", 100) for q in queries))
    return data


def draft(root, store, path, account_id=""):
    brief = validate_brief(root, path)
    if account_id:
        identifier(account_id)
        if not re.fullmatch(r"(?:a2|t2)_[A-Za-z0-9]+", account_id):
            raise ValueError("Use an ad account ID from the accounts command.")
    content = json.dumps({"brief": brief, "account_id": account_id}, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(content.encode()).hexdigest()
    draft_id = "rd-" + uuid.uuid4().hex[:16]
    evidence = store.evidence(brief["audience"]["country"], brief["audience"]["community_queries"])
    with store.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        previous = db.execute("SELECT id FROM drafts WHERE digest=?", (digest,)).fetchone()
        if previous:
            return store.get(previous["id"])
        remote_name = f"{brief['name']} [{draft_id}]"
        db.execute("INSERT INTO drafts(id,digest,brief,evidence,account_id,remote_name,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?)",
                   (draft_id, digest, json.dumps(brief), json.dumps(evidence), account_id, remote_name, "draft", now(), now()))
        store.record(db, draft_id, "draft", "Prepared locally; no remote campaign exists yet.")
    return store.get(draft_id)


def preview(row):
    url = urlsplit(row["brief"]["destination_url"])
    query = [(k, v) for k, v in parse_qsl(url.query, keep_blank_values=True) if not k.startswith("utm_")]
    query.extend([("utm_source", "reddit"), ("utm_medium", "paid_social"), ("utm_campaign", row["id"])])
    return {**row, "tracked_destination": urlunsplit((url.scheme, url.netloc, url.path, urlencode(query), "")),
            "remote_payload": {"data": {"name": row["remote_name"], "objective": "CLICKS", "configured_status": "PAUSED",
                                         "is_campaign_budget_optimization": False}},
            "remote_scope": "Campaign container only. Audience, link and copy are a local brief, not applied to Reddit.",
            "ad_groups_created": False, "ads_created": False, "spending_enabled": False,
            "gameplay_measurement": "Not installed by this adapter; URL tags alone do not measure game starts."}


def _verify(store, row, client, remote_id):
    remote = client.get(f"/campaigns/{identifier(remote_id)}").get("data")
    if (not isinstance(remote, dict) or remote.get("id") != remote_id
            or remote.get("ad_account_id") != row["account_id"] or remote.get("name") != row["remote_name"]):
        raise ApiError("Campaign identity/account did not match the stored draft; inspect Reddit Ads Manager.", uncertain=True)
    if remote.get("configured_status") not in ("PAUSED", "ACTIVE"):
        raise ApiError("The remote campaign was archived/deleted or has an unknown state; inspect Ads Manager.", uncertain=True)
    if remote.get("effective_status") in ("ARCHIVED", "DELETED"):
        raise ApiError("The remote campaign is effectively archived/deleted; inspect Ads Manager.", uncertain=True)
    if remote.get("configured_status") != "PAUSED" or remote.get("effective_status") == "ACTIVE":
        # Repair only this exact, identified draft; never change another campaign.
        client.pause(remote_id)
        remote = client.get(f"/campaigns/{identifier(remote_id)}").get("data")
        if (not isinstance(remote, dict) or remote.get("id") != remote_id
                or remote.get("ad_account_id") != row["account_id"]
                or remote.get("name") != row["remote_name"] or remote.get("configured_status") != "PAUSED"
                or remote.get("effective_status") in ("ACTIVE", "ARCHIVED", "DELETED")):
            raise ApiError("Could not confirm the draft is paused; inspect Reddit Ads Manager.", uncertain=True)
    store.update(row["id"], "remote_paused", "Confirmed remote campaign container is configured PAUSED; no ads or ad groups created.", remote_id)
    return preview(store.get(row["id"]))


def send(store, draft_id, client):
    row = store.get(draft_id)
    if not row["account_id"]:
        raise ValueError("Draft is not bound to an ad account. Prepare a new draft with --account from the accounts command.")
    if "adsedit" not in client.scopes:
        raise ValueError("Authorization lacks adsedit; reconnect before sending a paused draft.")
    account = client.account(row["account_id"])
    if not isinstance(account, dict) or account.get("id") != row["account_id"]:
        raise ValueError("Reddit did not confirm access to the draft's ad account.")
    with store.connect() as db:
        db.execute("BEGIN IMMEDIATE")
        current = db.execute("SELECT status FROM drafts WHERE id=?", (draft_id,)).fetchone()
        if current["status"] != "draft":
            raise ValueError("This draft was already attempted. Use sync to reconcile it; no duplicate was sent.")
        store.record(db, draft_id, "submitting", "Paused campaign create request claimed; do not repeat without reconciliation.")
    try:
        response = client.create_paused(row["account_id"], row["remote_name"])
    except ApiError as error:
        store.update(draft_id, "uncertain" if error.uncertain else "draft", str(error))
        raise
    remote = response.get("data")
    remote_id = remote.get("id") if isinstance(remote, dict) else None
    if not isinstance(remote_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", remote_id):
        store.update(draft_id, "uncertain", "Create response lacked a usable campaign ID. Use sync; do not send again.")
        raise ApiError("Campaign create result is uncertain. Run sync before any further action.", uncertain=True)
    store.update(draft_id, "remote_unverified", "Remote ID saved; pause state still requires confirmation.", remote_id)
    try:
        return _verify(store, row, client, remote_id)
    except (ValueError, OSError, KeyError, TypeError):
        store.update(draft_id, "uncertain", "Remote ID saved but verification failed. Run sync; do not send again.", remote_id)
        raise


def sync(store, draft_id, client):
    row = store.get(draft_id)
    if not row["account_id"]:
        raise ValueError("Draft has no bound Reddit ad account.")
    if row["status"] == "draft" and not row["remote_id"]:
        return {"id": draft_id, "status": "draft", "message": "No uncertain remote write to reconcile."}
    remote_id = row["remote_id"]
    if not remote_id:
        # listing() must complete successfully: a partial result is never absence evidence.
        rows = client.listing(f"/ad_accounts/{identifier(row['account_id'])}/campaigns?page.size=100")
        matches = [remote for remote in rows if remote.get("name") == row["remote_name"]]
        if len(matches) != 1:
            store.update(draft_id, "uncertain", "No unique matching remote campaign found. Inspect Ads Manager; automatic resend is blocked.")
            raise ValueError("Could not reconcile exactly one remote campaign. No new campaign was sent.")
        remote_id = identifier(matches[0].get("id"))
        store.update(draft_id, "remote_unverified", "Found matching remote campaign; checking identity and pause state.", remote_id)
    try:
        return _verify(store, row, client, remote_id)
    except (ValueError, OSError, KeyError, TypeError):
        store.update(draft_id, "uncertain", "Could not confirm the remote draft. Automatic resend remains blocked.", remote_id)
        raise
