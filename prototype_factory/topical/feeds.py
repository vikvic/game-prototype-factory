"""Bounded public RSS collection. Feed text is data, never builder instructions."""
import hashlib
import http.client
import ipaddress
import json
import socket
import ssl
import time
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlsplit

from .store import now


def public_url(url):
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Only public HTTPS URLs without credentials are allowed")
    addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError("Feed host resolves to a non-public address")
    return parsed, addresses


def fetch(url, timeout=15, maximum=2_000_000):
    deadline = time.monotonic() + timeout
    for _ in range(4):
        parsed, addresses = public_url(url)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ValueError("Feed fetch deadline exceeded")
        raw = socket.create_connection((addresses[0][4][0], 443), timeout=remaining)
        connection = http.client.HTTPSConnection(parsed.hostname, timeout=remaining)
        try:
            connection.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=parsed.hostname)
            path = (parsed.path or "/") + ("?" + parsed.query if parsed.query else "")
            connection.request("GET", path, headers={"User-Agent": "TopicalFactory/0.1 RSS reader", "Accept-Encoding": "identity"})
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                url = urljoin(url, response.getheader("Location", ""))
                continue
            if response.status != 200:
                raise ValueError(f"Feed returned HTTP {response.status}")
            chunks, size = [], 0
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ValueError("Feed fetch deadline exceeded")
                connection.sock.settimeout(remaining)
                chunk = response.read(min(65536, maximum + 1 - size))
                if not chunk:
                    return b"".join(chunks)
                chunks.append(chunk)
                size += len(chunk)
                if size > maximum:
                    raise ValueError("Feed exceeds size limit")
        finally:
            connection.close()
            raw.close()
    raise ValueError("Too many feed redirects")


def parse(raw):
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("DTD/entity declarations are not accepted")
    tree = ET.fromstring(raw)
    result = []
    for entry in tree.iter():
        if entry.tag.split("}")[-1] not in ("item", "entry"):
            continue
        fields = {child.tag.split("}")[-1]: child for child in entry}
        def content(key):
            node = fields.get(key)
            return "" if node is None else "".join(node.itertext()).strip()
        link = fields.get("link")
        url = "" if link is None else link.attrib.get("href", content("link"))
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            continue
        result.append({"title": content("title")[:500], "url": url[:4000], "published": (content("pubDate") or content("published") or content("updated"))[:100] or None})
        if len(result) >= 200:
            break
    return result


def collect(root, store, config):
    sources = json.loads((root / "research" / "sources.json").read_text(encoding="utf-8"))
    results = []
    for source in sources:
        cache = store.state / ("feed-" + hashlib.sha256(source["url"].encode()).hexdigest() + ".xml")
        try:
            settings = config["research"]
            cached = cache.is_file() and time.time() - cache.stat().st_mtime < settings["cache_minutes"] * 60
            raw = cache.read_bytes() if cached else fetch(source["url"], settings["timeout_seconds"], settings["max_feed_bytes"])
            items = parse(raw)
            if not cached:
                cache.write_bytes(raw)
            added = 0
            with store.connect() as db:
                for item in items:
                    key = hashlib.sha256((source["url"] + item["url"] + item["title"]).encode()).hexdigest()
                    added += db.execute("INSERT OR IGNORE INTO feed_items VALUES(?,?,?,?,?,?)", (key, source["name"], item["title"], item["url"], item["published"], now())).rowcount
            results.append({"source": source["name"], "added": added, "items": len(items), "cached": cached})
        except (OSError, ValueError, ET.ParseError, http.client.HTTPException) as error:
            results.append({"source": source["name"], "error": str(error)})
        store.event("research", "collection", json.dumps(results[-1]))
    return results
