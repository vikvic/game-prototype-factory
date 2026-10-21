import json
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

ID = re.compile(r"[a-z0-9][a-z0-9-]{0,63}\Z")


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def identifier(value):
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise ValueError("ID must contain 1–64 lowercase letters, digits or hyphens")
    return value


class TopicalStore:
    def __init__(self, root):
        self.root = root.resolve()
        self.state = self.root / ".factory" / "topical"
        self.state.mkdir(parents=True, exist_ok=True)
        self.path = self.state / "topical.sqlite3"
        with self.connect() as db:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1):
                raise ValueError(f"Unsupported topical schema {version}")
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS opportunities(id TEXT PRIMARY KEY, status TEXT NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS feed_items(id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, published TEXT, observed TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS releases(id TEXT PRIMARY KEY, edition TEXT NOT NULL, opportunity TEXT NOT NULL, status TEXT NOT NULL, fingerprint TEXT NOT NULL, data TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY, entity TEXT NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL, at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS accounting(id TEXT PRIMARY KEY, edition TEXT, kind TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, basis TEXT NOT NULL, period TEXT NOT NULL, note TEXT NOT NULL);
                PRAGMA user_version=1;
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def event(self, entity, kind, message):
        with self.connect() as db:
            db.execute("INSERT INTO events(entity,kind,message,at) VALUES(?,?,?,?)", (entity, kind, message[:2000], now()))

    def opportunities(self):
        with self.connect() as db:
            return [dict(row) | {"data": json.loads(row["data"])} for row in db.execute("SELECT * FROM opportunities ORDER BY updated DESC,id")]

    def opportunity(self, key):
        identifier(key)
        with self.connect() as db:
            row = db.execute("SELECT * FROM opportunities WHERE id=?", (key,)).fetchone()
        if not row:
            raise ValueError(f"Unknown opportunity: {key}")
        return dict(row) | {"data": json.loads(row["data"])}

    def release(self, key):
        identifier(key)
        with self.connect() as db:
            row = db.execute("SELECT * FROM releases WHERE id=?", (key,)).fetchone()
        if not row:
            raise ValueError(f"Unknown release: {key}")
        return dict(row) | {"data": json.loads(row["data"])}

    def releases(self):
        with self.connect() as db:
            return [dict(row) | {"data": json.loads(row["data"])} for row in db.execute("SELECT * FROM releases ORDER BY created DESC,id")]

    def update_release(self, key, status, data, expected=None):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT status FROM releases WHERE id=?", (key,)).fetchone()
            if not row or (expected and row["status"] not in expected):
                raise ValueError("Release changed concurrently or has an invalid state")
            db.execute("UPDATE releases SET status=?,data=?,updated=? WHERE id=?", (status, json.dumps(data), now(), key))
        self.event(key, status, data.get("error") or status)
