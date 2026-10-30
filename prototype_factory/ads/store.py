"""Private campaign drafts and attempt journal, isolated from game build queues."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from .auth import state_dir


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, root):
        self.folder = state_dir(root)
        self.folder.mkdir(parents=True, exist_ok=True)
        self.path = self.folder / "drafts.sqlite3"
        with self.connect() as db:
            if db.execute("PRAGMA user_version").fetchone()[0] not in (0, 1):
                raise ValueError("Unsupported Reddit draft database version.")
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS drafts (
                    id TEXT PRIMARY KEY, digest TEXT NOT NULL UNIQUE,
                    brief TEXT NOT NULL, evidence TEXT NOT NULL, account_id TEXT NOT NULL,
                    remote_name TEXT NOT NULL UNIQUE, status TEXT NOT NULL,
                    remote_id TEXT, created TEXT NOT NULL, updated TEXT NOT NULL,
                    last_error TEXT
                );
                CREATE TABLE IF NOT EXISTS events (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, draft_id TEXT NOT NULL,
                    at TEXT NOT NULL, state TEXT NOT NULL, message TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS targeting (
                    kind TEXT NOT NULL, query TEXT NOT NULL, fetched TEXT NOT NULL,
                    result TEXT NOT NULL, PRIMARY KEY(kind,query)
                );
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

    def record(self, db, draft_id, status, message, remote_id=None):
        db.execute("UPDATE drafts SET status=?,updated=?,last_error=?,remote_id=COALESCE(?,remote_id) WHERE id=?",
                   (status, now(), message if status == "uncertain" else None, remote_id, draft_id))
        db.execute("INSERT INTO events(draft_id,at,state,message) VALUES(?,?,?,?)", (draft_id, now(), status, message))

    def update(self, draft_id, status, message, remote_id=None):
        with self.connect() as db:
            self.record(db, draft_id, status, message, remote_id)

    def get(self, draft_id):
        with self.connect() as db:
            row = db.execute("SELECT * FROM drafts WHERE id=?", (draft_id,)).fetchone()
            events = db.execute("SELECT at,state,message FROM events WHERE draft_id=? ORDER BY seq", (draft_id,)).fetchall()
        if row is None:
            raise ValueError("Unknown Reddit draft ID.")
        result = dict(row)
        result["brief"] = json.loads(result["brief"])
        result["evidence"] = json.loads(result["evidence"])
        result["events"] = [dict(row) for row in events]
        return result

    def rows(self):
        with self.connect() as db:
            return [dict(row) for row in db.execute(
                "SELECT id,status,account_id,remote_id,created,updated,last_error FROM drafts ORDER BY created DESC,rowid DESC")]

    def targeting(self, kind, query, rows):
        at = now()
        with self.connect() as db:
            db.execute("INSERT OR REPLACE INTO targeting(kind,query,fetched,result) VALUES(?,?,?,?)",
                       (kind, query, at, json.dumps(rows)))
        return {"kind": kind, "query": query, "fetched": at, "matches": rows}

    def evidence(self, country, queries):
        result = []
        with self.connect() as db:
            for kind, query in [("geolocations", country), *[("communities", q) for q in queries]]:
                row = db.execute("SELECT fetched,result FROM targeting WHERE kind=? AND query=?", (kind, query)).fetchone()
                result.append({"kind": kind, "query": query, "fetched": row["fetched"] if row else None,
                               "matches": json.loads(row["result"]) if row else [],
                               "checked": row is not None})
        return result
