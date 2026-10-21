import re
import tomllib
from urllib.parse import urlsplit


def load(root):
    with (root / "commercial.toml").open("rb") as stream:
        config = tomllib.load(stream)
    for section in ("site", "research", "build", "analytics", "ads", "deploy"):
        if not isinstance(config.get(section), dict):
            raise ValueError(f"Missing [{section}] in commercial.toml")
    site = config["site"]
    if not isinstance(site.get("name"), str) or not 1 <= len(site["name"]) <= 80:
        raise ValueError("site.name must contain 1–80 characters")
    if site.get("url"):
        parsed = urlsplit(site["url"])
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ("", "/"):
            raise ValueError("site.url must be an HTTPS origin without credentials/path/query")
    if not isinstance(config["analytics"].get("enabled"), bool):
        raise ValueError("analytics.enabled must be boolean")
    if not all(isinstance(config["ads"].get(k), bool) for k in ("enabled", "approved", "rewarded")):
        raise ValueError("Ads flags must be booleans")
    if config["ads"]["enabled"]:
        raise ValueError("Production ads are not enabled in the pilot adapter; keep ads.enabled=false")
    if config["analytics"]["enabled"] and not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}", config["analytics"].get("domain", "")):
        raise ValueError("Analytics requires a public domain")
    for section, names in (("research", ("timeout_seconds", "max_feed_bytes", "cache_minutes")), ("build", ("install_timeout_seconds", "build_timeout_seconds", "verify_timeout_seconds"))):
        for name in names:
            value = config[section].get(name)
            if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
                raise ValueError(f"{section}.{name} must be a positive integer")
    return config


def readiness(config):
    return {"local_build": "available", "brand": config["site"]["name"],
            "public_origin": config["site"]["url"] or "unset",
            "hosting": "needs-account-and-project" if not config["deploy"]["cloudflare_project"] else "configured-not-verified",
            "contact": "configured" if config["site"]["contact_email"] else "unset",
            "analytics": "configured-not-verified" if config["analytics"]["enabled"] else "disabled",
            "ads": "disabled; approval, consent integration and production adapter still required",
            "outreach": "manual; no messages or posts sent"}
