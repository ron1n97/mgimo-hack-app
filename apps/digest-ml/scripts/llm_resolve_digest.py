#!/usr/bin/env python3
"""One-shot LLM resolve + title/body polish for digest prototype.

Reads EventCandidate (AI-only rows), asks Z Code for verdict + clean title,
writes APPROVED/REJECTED. Never leaves PENDING.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]


def parse_db(url: str) -> dict:
    u = urlparse(url)
    return {
        "host": u.hostname or "127.0.0.1",
        "port": u.port or 5432,
        "user": unquote(u.username or ""),
        "password": unquote(u.password or ""),
        "dbname": (u.path or "/dekanat").lstrip("/").split("?")[0],
    }


SYSTEM = """Ты редактор студенческого дайджеста МГИМО.
Нужны только анонсы мероприятий (лекция, семинар, игра, дебаты, open talk, кинопоказ, клуб, хакатон, дедлайн регистрации, сбор) с датой/временем/местом или явным сроком.
REJECT: ДР, pinned, мемы, крипта, сленг, учебные карточки, чистый постфактум («прошла на ура») без нового анонса, пустые «Дорогие друзья!» без события в тексте.
Если event — придумай короткий русский title (до 90 символов) по сути, не «Дорогие друзья!».
body_short — 1–2 предложения для карточки (можно сжать исходник).
Ответ ТОЛЬКО JSON:
{"verdict":"event"|"junk","title":"...","body_short":"...","reason":"..."}"""


def chat(title: str, body: str) -> dict | None:
    key = (os.environ.get("ZCODE_API_KEY") or "").strip()
    if not key:
        return None
    base = (
        os.environ.get("ZCODE_BASE_URL")
        or "https://api.z.ai/api/coding/paas/v4"
    ).rstrip("/")
    model = os.environ.get("ZCODE_MODEL") or "glm-5.3"
    payload = {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {
                "role": "user",
                "content": f"Заголовок: {title}\nТекст:\n{(body or '')[:1500]}",
            },
        ],
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        content = (
            data.get("choices", [{}])[0].get("message", {}).get("content") or ""
        ).strip()
        start, end = content.find("{"), content.rfind("}")
        if start < 0 or end <= start:
            return None
        obj = json.loads(content[start : end + 1])
        verdict = str(obj.get("verdict", "")).lower()
        if verdict not in ("event", "junk"):
            # soft parse
            if "event" in verdict or "approve" in verdict:
                verdict = "event"
            elif "junk" in verdict or "reject" in verdict:
                verdict = "junk"
            else:
                return None
        title_out = (obj.get("title") or title or "").strip()[:120]
        body_out = (obj.get("body_short") or body or "").strip()
        if len(body_out) > 600:
            body_out = body_out[:597] + "…"
        return {
            "verdict": verdict,
            "title": title_out or title,
            "body": body_out or body,
            "reason": str(obj.get("reason") or ""),
        }
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None


def process_row(row: dict) -> dict:
    result = chat(row["title"], row["body"])
    if not result:
        # fail-closed for junk-looking greetings; else keep approve if already approved
        t = f"{row['title']}\n{row['body'] or ''}".lower()
        junkish = any(
            x in t
            for x in (
                "день рождения",
                "поздравляем",
                "pinned",
                "bitcoin",
                "майнер",
                "сленг",
                "прошла на ура",
            )
        )
        eventish = any(
            x in t
            for x in (
                "регистрац",
                "семинар",
                "лекци",
                "хакатон",
                "open talk",
                "дебат",
                "кинопоказ",
                "в 16:",
                "зал ",
            )
        )
        if junkish and not eventish:
            verdict = "junk"
        elif eventish:
            verdict = "event"
        else:
            verdict = "junk" if row["moderationStatus"] != "APPROVED" else "event"
        result = {
            "verdict": verdict,
            "title": row["title"],
            "body": row["body"],
            "reason": "fallback",
        }
    status = "APPROVED" if result["verdict"] == "event" else "REJECTED"
    return {
        "id": row["id"],
        "status": status,
        "title": result["title"],
        "body": result["body"],
        "reason": result.get("reason") or "",
    }


def main() -> int:
    db_url = os.environ.get("DATABASE_URL")
    key = (os.environ.get("ZCODE_API_KEY") or "").strip()
    if not db_url or not key:
        print("DATABASE_URL and ZCODE_API_KEY required", file=sys.stderr)
        return 2

    import psycopg2
    import psycopg2.extras

    limit = int(os.environ.get("DIGEST_ML_LIMIT") or 400)
    workers = int(os.environ.get("DIGEST_LLM_WORKERS") or 4)

    conn = psycopg2.connect(**parse_db(db_url))
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        SELECT id, title, body, "moderationStatus"
        FROM "EventCandidate"
        WHERE "moderatedByUserId" IS NULL
          AND "moderationStatus" IN ('PENDING', 'APPROVED', 'REJECTED')
        ORDER BY
          CASE "moderationStatus"
            WHEN 'PENDING' THEN 0
            WHEN 'APPROVED' THEN 1
            ELSE 2
          END,
          "publishedAt" DESC NULLS LAST
        LIMIT %s
        """,
        (limit,),
    )
    rows = list(cur.fetchall())
    print(f"llm_resolve scanning {len(rows)} workers={workers}", flush=True)

    updates: list[dict] = []
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(process_row, dict(r)): r["id"] for r in rows}
        for fut in as_completed(futs):
            updates.append(fut.result())
            done += 1
            if done % 20 == 0 or done == len(rows):
                print(f"progress {done}/{len(rows)}", flush=True)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    stats = {"scanned": len(rows), "approved": 0, "rejected": 0, "titles": 0}
    for u in updates:
        cur.execute(
            """
            UPDATE "EventCandidate"
            SET "moderationStatus" = %s,
                "moderatedAt" = %s,
                title = %s,
                body = %s
            WHERE id = %s
            """,
            (u["status"], now, u["title"], u["body"], u["id"]),
        )
        if u["status"] == "APPROVED":
            stats["approved"] += 1
        else:
            stats["rejected"] += 1
        # rough title change count
        stats["titles"] += 1

    conn.commit()
    cur.close()
    conn.close()
    print(json.dumps(stats, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
