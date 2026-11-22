#!/usr/bin/env python3
"""Lightweight TF-IDF LogReg reclassify (no torch) — for tight VPS disks."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MODEL = Path(
    os.environ.get("DIGEST_ML_MODEL_PATH")
    or (ROOT / "artifacts" / "model-tfidf.json")
)


def parse_db(url: str) -> dict:
    u = urlparse(url)
    return {
        "host": u.hostname or "127.0.0.1",
        "port": u.port or 5432,
        "user": unquote(u.username or ""),
        "password": unquote(u.password or ""),
        "dbname": (u.path or "/dekanat").lstrip("/").split("?")[0],
    }


def char_wb_ngrams(text: str, n_min: int, n_max: int) -> list[str]:
    padded = f" {' '.join(text.split())} "
    out: list[str] = []
    for n in range(n_min, n_max + 1):
        for i in range(0, len(padded) - n + 1):
            out.append(padded[i : i + n])
    return out


def vectorize(text: str, model: dict) -> np.ndarray:
    tfidf = model["tfidf"]
    n_min, n_max = tfidf["ngram_range"]
    vocab = tfidf["vocabulary"]
    idf = np.asarray(tfidf["idf"], dtype=np.float64)
    counts: dict[int, int] = {}
    for g in char_wb_ngrams(text.lower(), n_min, n_max):
        idx = vocab.get(g)
        if idx is None:
            continue
        counts[idx] = counts.get(idx, 0) + 1
    vec = np.zeros(len(idf), dtype=np.float64)
    for idx, c in counts.items():
        vec[idx] = c * idf[idx]
    n = np.linalg.norm(vec) or 1.0
    return vec / n


def sigmoid(z: float) -> float:
    if z >= 0:
        ez = np.exp(-z)
        return float(1 / (1 + ez))
    ez = np.exp(z)
    return float(ez / (1 + ez))


def predict(text: str, model: dict) -> tuple[float, bool]:
    feat = vectorize(text, model)
    coef = np.asarray(model["coef"][0], dtype=np.float64)
    intercept = float(model["intercept"][0])
    p = sigmoid(float(np.dot(coef[: len(feat)], feat) + intercept))
    low = float(model["thresholds"]["low"])
    high = float(model["thresholds"]["high"])
    return p, low < p < high


def improve_title(title: str, body: str | None) -> str:
    t = (title or "").strip()
    if t and not t.lower().startswith("дорогие друзья") and len(t) >= 12:
        return t
    raw = " ".join((body or "").split())
    if not raw:
        return t
    m = re.search(r"«([^»]{12,90})»", raw)
    if m:
        return m.group(1)
    return (raw.split(".")[0] or t)[:120]


def llm_verify(title: str, body: str, p_event: float) -> str | None:
    key = (os.environ.get("ZCODE_API_KEY") or "").strip()
    if not key:
        return None
    import urllib.request

    base = (
        os.environ.get("ZCODE_BASE_URL")
        or "https://api.z.ai/api/coding/paas/v4"
    ).rstrip("/")
    model = os.environ.get("ZCODE_MODEL") or "glm-5.3"
    payload = {
        "model": model,
        "temperature": 0,
        "messages": [
            {
                "role": "system",
                "content": 'Verify MGIMO digest. JSON only: {"verdict":"event"|"junk"|"unsure"}',
            },
            {
                "role": "user",
                "content": f"ML p(event)={p_event:.3f}\nTitle: {title}\nBody: {(body or '')[:1200]}",
            },
        ],
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
        content = (
            data.get("choices", [{}])[0].get("message", {}).get("content") or ""
        ).lower()
        if "event" in content or "approve" in content:
            return "APPROVED"
        if "junk" in content or "reject" in content:
            return "REJECTED"
    except Exception:  # noqa: BLE001
        return None
    return None


def main() -> int:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL required", file=sys.stderr)
        return 2
    model = json.loads(MODEL.read_text(encoding="utf-8"))
    if model.get("type") != "logreg_tfidf":
        print(f"expected logreg_tfidf, got {model.get('type')}", file=sys.stderr)
        return 3

    import psycopg2
    import psycopg2.extras

    conn = psycopg2.connect(**parse_db(db_url))
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
    print(f"scanning {len(rows)}", flush=True)
    stats = {"scanned": len(rows), "approved": 0, "rejected": 0, "pending": 0, "titles": 0}
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for r in rows:
        text = f"{r['title']}\n{r['body'] or ''}"
        p_event, uncertain = predict(text, model)
        # Prototype: always resolve. LLM verify optional; mid-band → 0.5 cutoff.
        if uncertain:
            verified = (
                llm_verify(r["title"], r["body"], p_event)
                if (os.environ.get("ZCODE_API_KEY") or "").strip()
                else None
            )
            status = verified or (
                "APPROVED" if p_event >= 0.5 else "REJECTED"
            )
        else:
            status = "APPROVED" if p_event >= 0.5 else "REJECTED"

        new_title = improve_title(r["title"], r["body"])
        title_changed = new_title != r["title"]
        if (
            status == "PENDING"
            and r["moderationStatus"] == "PENDING"
            and not title_changed
        ):
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
    print(json.dumps(stats, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
