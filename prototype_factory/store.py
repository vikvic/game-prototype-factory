import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.state = self.root / ".factory"
        self.state.mkdir(parents=True, exist_ok=True)
        self.path = self.state / "queue.sqlite3"
        with self.connect() as db:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1):
                raise ValueError(f"Unsupported database schema: {version}")
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, idea_key TEXT NOT NULL, digest TEXT NOT NULL,
                    title TEXT NOT NULL, template TEXT NOT NULL, priority INTEGER NOT NULL,
                    source TEXT NOT NULL, body TEXT NOT NULL, preferences TEXT NOT NULL,
                    config TEXT NOT NULL, attempt INTEGER NOT NULL,
                    status TEXT NOT NULL, phase TEXT NOT NULL, created TEXT NOT NULL,
                    updated TEXT NOT NULL, error TEXT, folder TEXT, published TEXT,
                    deploy_url TEXT, deploy_sha TEXT,
                    UNIQUE(idea_key,digest,attempt)
                );
                CREATE INDEX IF NOT EXISTS queue_order ON jobs(status,priority DESC,created);
                CREATE TABLE IF NOT EXISTS events (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL,
                    at TEXT NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS outbox (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL,
                    content TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
                    due REAL NOT NULL DEFAULT 0, sent TEXT, last_error TEXT
                );
                PRAGMA user_version=1;
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA busy_timeout=15000")
        try:
            with db:
                yield db
        finally:
            db.close()

    def event(self, db, job_id: str, kind: str, message: str, notify=False):
        db.execute("INSERT INTO events(job_id,at,kind,message) VALUES(?,?,?,?)",
                   (job_id, now(), kind, message))
        if notify:
            db.execute("INSERT INTO outbox(job_id,content) VALUES(?,?)", (job_id, f"[{job_id}] {message}"))

    def enqueue(self, ideas: list[dict], preferences: str, config: dict) -> list[str]:
        added = []
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for idea in ideas:
                latest = db.execute("SELECT digest FROM jobs WHERE idea_key=? ORDER BY rowid DESC LIMIT 1",
                                    (idea["idea_key"],)).fetchone()
                if latest and latest["digest"] == idea["digest"]:
                    continue
                old = db.execute("SELECT id FROM jobs WHERE idea_key=? AND status='queued'",
                                 (idea["idea_key"],)).fetchall()
                for item in old:
                    db.execute("UPDATE jobs SET status='cancelled',phase='superseded',updated=? WHERE id=?", (now(), item[0]))
                    self.event(db, item[0], "cancelled", "Superseded by a newer idea revision")
                job_id = f"{idea['idea_key']}-{uuid.uuid4().hex[:8]}"
                values = {k: idea[k] for k in ("idea_key", "digest", "title", "template", "priority", "source", "body")}
                attempt = db.execute("SELECT COALESCE(MAX(attempt),0)+1 FROM jobs WHERE idea_key=? AND digest=?",
                                     (idea["idea_key"], idea["digest"])).fetchone()[0]
                values.update(id=job_id, preferences=preferences, config=json.dumps(config), attempt=attempt,
                              status="queued", phase="queued", created=now(), updated=now())
                cols = ",".join(values)
                db.execute(f"INSERT INTO jobs({cols}) VALUES({','.join('?' for _ in values)})", tuple(values.values()))
                self.event(db, job_id, "queued", f"Queued: {idea['title']}")
                added.append(job_id)
        return added

    def get(self, job_id: str) -> dict:
        with self.connect() as db:
            row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not row:
            raise ValueError(f"Unknown job: {job_id}")
        return dict(row)

    def jobs(self) -> list[dict]:
        with self.connect() as db:
            return [dict(row) for row in db.execute("SELECT * FROM jobs ORDER BY created DESC,rowid DESC")]

    def events(self, job_id=None) -> list[dict]:
        with self.connect() as db:
            sql, args = (" WHERE job_id=?", (job_id,)) if job_id else ("", ())
            return [dict(row) for row in db.execute("SELECT * FROM events" + sql + " ORDER BY seq DESC LIMIT 100", args)]

    def claim(self) -> dict | None:
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT id FROM jobs WHERE status='queued' ORDER BY priority DESC,created,rowid LIMIT 1").fetchone()
            if not row:
                return None
            db.execute("UPDATE jobs SET status='running',phase='prepare',updated=? WHERE id=?", (now(), row[0]))
            self.event(db, row[0], "running", "Build started", notify=True)
        return self.get(row[0])

    def update(self, job_id: str, **values):
        allowed = {"status", "phase", "error", "folder", "published", "deploy_url", "deploy_sha"}
        if set(values) - allowed:
            raise ValueError("Invalid job update")
        values["updated"] = now()
        with self.connect() as db:
            db.execute(f"UPDATE jobs SET {','.join(k + '=?' for k in values)} WHERE id=?", (*values.values(), job_id))
            message = values.get("error") or values.get("status") or values.get("phase") or "Deployment metadata updated"
            self.event(db, job_id, values.get("status", "phase"), message,
                       notify="status" in values and values["status"] != "running")

    def cancel(self, job_id: str):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            changed = db.execute("UPDATE jobs SET status='cancelled',phase='cancelled',updated=? WHERE id=? AND status='queued'", (now(), job_id)).rowcount
            if not changed:
                raise ValueError("Only queued jobs can be cancelled. Stop the worker with Ctrl+C for a running job.")
            self.event(db, job_id, "cancelled", "Cancelled by user")

    def retry(self, job_id: str, config: dict | None = None) -> str:
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            if not row:
                raise ValueError(f"Unknown job: {job_id}")
            if row["status"] in ("running", "queued"):
                raise ValueError("Cannot retry a queued or running job")
            if db.execute("SELECT 1 FROM jobs WHERE idea_key=? AND status IN ('running','queued')", (row["idea_key"],)).fetchone():
                raise ValueError("This idea already has an active attempt")
            values = dict(row)
            if config is not None:
                values["config"] = json.dumps(config)
            values.update(id=f"{row['idea_key']}-{uuid.uuid4().hex[:8]}", status="queued", phase="queued",
                          created=now(), updated=now(), error=None, folder=None, published=None, deploy_url=None, deploy_sha=None)
            values["attempt"] = db.execute("SELECT MAX(attempt)+1 FROM jobs WHERE idea_key=? AND digest=?", (row["idea_key"], row["digest"])).fetchone()[0]
            db.execute(f"INSERT INTO jobs({','.join(values)}) VALUES({','.join('?' for _ in values)})", tuple(values.values()))
            label = "idea/preferences retained; current builder configuration" if config is not None else "original snapshot retained"
            self.event(db, values["id"], "queued", f"Retry of {job_id}; {label}")
        return values["id"]
