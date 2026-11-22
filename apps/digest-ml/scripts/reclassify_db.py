#!/usr/bin/env python3
"""One-shot: ST+LogReg (+ optional LLM verify) over EventCandidate on DATABASE_URL."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, unquote

import httpx
import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
JOBLIB = Path(os.environ.get("DIGEST_ML_JOBLIB") or (ROOT / "artifacts" / "model.joblib"))


def parse_db(url: str) -> dict:
    u = urlparse(url)
    return {
        "host": u.hostname or "127.0.0.1",
        "port": u.port or 5432,
        "user": unquote(u.username or ""),
        "password": unquote(u.password or ""),
        "dbname": (u.path or "/dekanat").lstrip("/").split("?")[0],
    }


def llm_verify(title: str, body: str, p_event: float) -> str | None:
    key = (os.environ.get("ZCODE_API_KEY") or "").strip()
    if not key:
        return None
    base = (
        os.environ.get("ZCODE_BASE_URL")
        or "https://api.z.ai/api/coding/paas/v4"
    ).rstrip("/")
    model = os.environ.get("ZCODE_MODEL") or "glm-5.3"
    system = (
        "Ты верификатор дайджеста МГИМО. "
        'JSON only: {"verdict":"event"|"junk"|"unsure"}'
    )
    user = (
        f"ML p(event)={p_event:.3f}\nЗаголовок: {title}\nТекст: {(body or '')[:1200]}"
    )
    try:
        r = httpx.post(
            f"{base}/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=60.0,
        )
        if not r.is_success:
            return None
        content = (
            r.json().get("choices", [{}])[0].get("message", {}).get("content") or ""
        )
        low = content.lower()
        if "event" in low or "approve" in low:
            return "APPROVED"
        if "junk" in low or "reject" in low:
            return "REJECTED"
    except Exception:  # noqa: BLE001
        return None
    return None


def improve_title(title: str, body: str | None) -> str:
    t = (title or "").strip()
    if t and not t.lower().startswith("дорогие друзья") and len(t) >= 12:
        return t
    raw = " ".join((body or "").split())
    if not raw:
        return t
    if "«" in raw and "»" in raw:
        a, b = raw.find("«") + 1, raw.find("»")
        if 12 <= b - a <= 90:
            return raw[a:b]
    return (raw.split(".")[0] or t)[:120]


def main() -> int:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL required", file=sys.stderr)
        return 2
    if not JOBLIB.exists():
        print(f"missing {JOBLIB}", file=sys.stderr)
        return 3

    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("pip install psycopg2-binary", file=sys.stderr)
        return 4

    bundle = joblib.load(JOBLIB)
    clf = bundle["clf"]
    thresholds = bundle.get("thresholds") or {"low": 0.35, "high": 0.65}
    low, high = float(thresholds["low"]), float(thresholds["high"])

    from sentence_transformers import SentenceTransformer

    encoder = SentenceTransformer(bundle["st_model"])
    cfg = parse_db(db_url)
    conn = psycopg2.connect(**cfg)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        SELECT id, title, body, "moderationStatus"
        FROM "EventCandidate"
        WHERE "moderatedByUserId" IS NULL
          AND "moderationStatus" IN ('PENDING', 'REJECTED', 'APPROVED')
        ORDER BY "publishedAt" DESC NULLS LAST
        LIMIT %s
        """,
        (int(os.environ.get("DIGEST_ML_LIMIT") or 800),),
    )
    rows = cur.fetchall()
    texts = [f"{r['title']}\n{r['body'] or ''}" for r in rows]
    print(f"scanning {len(rows)} rows…", flush=True)
    if not rows:
        print(json.dumps({"scanned": 0}))
        return 0

    X = np.asarray(
        encoder.encode(texts, normalize_embeddings=True, show_progress_bar=True),
        dtype=np.float64,
    )
    proba = clf.predict_proba(X)
    classes = list(clf.classes_)
    event_idx = classes.index(1) if 1 in classes else len(classes) - 1

    stats = {"scanned": len(rows), "approved": 0, "rejected": 0, "pending": 0, "titles": 0}
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for r, row_p in zip(rows, proba):
        p_event = float(row_p[event_idx])
        if p_event >= high:
            status = "APPROVED"
        elif p_event <= low:
            status = "REJECTED"
        else:
            verified = llm_verify(r["title"], r["body"], p_event)
            status = verified or "PENDING"

        new_title = improve_title(r["title"], r["body"])
        title_changed = new_title != r["title"]
        if status == "PENDING" and r["moderationStatus"] == "PENDING" and not title_changed:
            stats["pending"] += 1
            continue
        if r["moderationStatus"] == "APPROVED" and status == "PENDING":
            status = "APPROVED"

        cur.execute(
            """
            UPDATE "EventCandidate"
            SET "moderationStatus" = %s,
                "moderatedAt" = %s,
                title = CASE WHEN %s THEN %s ELSE title END
            WHERE id = %s
            """,
            (status, now, title_changed, new_title, r["id"]),
        )
        if title_changed:
            stats["titles"] += 1
        if status == "APPROVED":
            stats["approved"] += 1
        elif status == "REJECTED":
            stats["rejected"] += 1
        else:
            stats["pending"] += 1

    conn.commit()
    cur.close()
    conn.close()
    print(json.dumps(stats, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
