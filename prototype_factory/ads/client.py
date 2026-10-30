"""Small fixed-origin Reddit Ads API v3 adapter; activation is unsupported."""
import json
import re
from urllib.parse import urlencode, urlsplit
from urllib.request import Request

from .auth import session
from .http import ApiError, USER_AGENT, request_json

BASE = "https://ads-api.reddit.com/api/v3"


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", value):
        raise ValueError("Invalid Reddit identifier.")
    return value


class Client:
    def __init__(self, root):
        self.token, self.scopes = session(root)

    def _request(self, method, path, *, payload=None):
        url = path if path.startswith("https://") else BASE + path
        parsed = urlsplit(url)
        if (parsed.scheme != "https" or parsed.netloc != "ads-api.reddit.com"
                or not parsed.path.startswith("/api/v3/") or parsed.fragment):
            raise ValueError("Refusing an unexpected Reddit API origin or path.")
        if method != "GET":
            if "adsedit" not in self.scopes:
                raise ValueError("Authorization lacks adsedit; reconnect before creating a paused draft.")
            data = payload.get("data", {}) if isinstance(payload, dict) else {}
            create = method == "POST" and re.fullmatch(r"/ad_accounts/[A-Za-z0-9_-]+/campaigns", path)
            pause = method == "PATCH" and re.fullmatch(r"/campaigns/[A-Za-z0-9_-]+", path)
            allowed = {"name", "configured_status", "objective", "is_campaign_budget_optimization"}
            if (set(payload or {}) != {"data"} or data.get("configured_status") != "PAUSED"
                    or not ((create and set(data) == allowed and data["objective"] == "CLICKS"
                             and data["is_campaign_budget_optimization"] is False)
                            or (pause and data == {"configured_status": "PAUSED"}))):
                raise ValueError("Only fixed paused campaign creation and pause repair are supported.")
        headers = {"Authorization": "Bearer " + self.token, "User-Agent": USER_AGENT, "Accept": "application/json"}
        raw = None
        if payload is not None:
            raw = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        return request_json(Request(url, data=raw, headers=headers, method=method), write=method != "GET")

    def get(self, path):
        return self._request("GET", path)

    def listing(self, path):
        rows, seen = [], set()
        original = urlsplit(BASE + path).path
        following = path
        for _ in range(30):
            if following in seen:
                raise ApiError("Reddit repeated a pagination link; listing is incomplete.")
            seen.add(following)
            page = self.get(following)
            data = page.get("data")
            if not isinstance(data, list) or any(not isinstance(row, dict) for row in data):
                raise ApiError("Reddit returned an invalid list; listing is incomplete.")
            rows.extend(data)
            following = (page.get("pagination") or {}).get("next_url")
            if not following:
                return rows
            if not isinstance(following, str) or urlsplit(following).path != original:
                raise ApiError("Reddit returned an unexpected pagination path.")
        raise ApiError("Reddit listing exceeded 30 pages; no complete-list conclusion is possible.")

    def businesses(self):
        return self.listing("/me/businesses?page.size=100")

    def accounts(self, business_id):
        return self.listing(f"/businesses/{identifier(business_id)}/ad_accounts?page.size=100")

    def account(self, account_id):
        return self.get(f"/ad_accounts/{identifier(account_id)}")["data"]

    def targeting(self, kind, query):
        if kind == "communities":
            return self.listing("/targeting/communities/search?" + urlencode({"query": query, "page.size": 100}))
        if kind == "interests":
            rows = self.listing("/targeting/interests")
            return [row for row in rows if query.casefold() in json.dumps(row, ensure_ascii=False).casefold()]
        if kind == "geolocations" and re.fullmatch(r"[A-Za-z]{2}", query):
            return self.listing("/targeting/geolocations?" + urlencode({"country": query.upper()}))
        raise ValueError("Choose communities, interests, or geolocations (a two-letter country code).")

    def create_paused(self, account_id, name):
        return self._request("POST", f"/ad_accounts/{identifier(account_id)}/campaigns", payload={"data": {
            "name": name, "objective": "CLICKS", "configured_status": "PAUSED", "is_campaign_budget_optimization": False}})

    def pause(self, campaign_id):
        return self._request("PATCH", f"/campaigns/{identifier(campaign_id)}", payload={"data": {"configured_status": "PAUSED"}})
