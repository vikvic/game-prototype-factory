import json
import math

from .store import identifier


def import_rows(store, path):
    rows = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(rows, list):
        raise ValueError("Accounting import must be a JSON list")
    for row in rows:
        identifier(row.get("id"))
        if row.get("edition") is not None:
            identifier(row["edition"])
        if row.get("kind") not in ("revenue", "cost", "shared-cost", "operator-time") or row.get("basis") not in ("estimated", "final"):
            raise ValueError("Invalid accounting kind/basis")
        amount = row.get("amount")
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not math.isfinite(amount) or amount < 0:
            raise ValueError("Accounting amounts must be finite nonnegative values")
        if row.get("currency") not in ("USD", "EUR", "GBP") or not row.get("period") or not row.get("note"):
            raise ValueError("Provide currency, period and report provenance note")
    with store.connect() as db:
        for row in rows:
            values = tuple(row.get(k) for k in ("id", "edition", "kind", "amount", "currency", "basis", "period", "note"))
            existing = db.execute("SELECT * FROM accounting WHERE id=?", (row["id"],)).fetchone()
            if existing and tuple(existing) != values:
                raise ValueError("Accounting ID already exists with different values; use a new correction record")
            db.execute("INSERT OR IGNORE INTO accounting VALUES(?,?,?,?,?,?,?,?)", values)
    return len(rows)


def report(store):
    with store.connect() as db:
        records = [dict(row) for row in db.execute("SELECT * FROM accounting ORDER BY period,id")]
    return {"note": "No reports means revenue unknown. Site-wide revenue stays unallocated. Currencies and estimated/final rows are not combined.", "records": records, "summary": [dict(currency=currency, basis=basis, kind=kind, edition=edition, amount=sum(r['amount'] for r in records if (r['currency'],r['basis'],r['kind'],r['edition'])==(currency,basis,kind,edition))) for currency,basis,kind,edition in sorted({(r['currency'],r['basis'],r['kind'],r['edition']) for r in records}, key=str)]}
