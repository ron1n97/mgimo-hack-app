#!/usr/bin/env python3
"""Curate digest: keep only real events, rewrite title + short body.

Reads approved JSON (or --from-db), writes updates JSON / applies SQL.
No LLM required — deterministic editor rules for the contest stand.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

GREET_TITLE = re.compile(
    r"^(уважаем\w*|дорог\w*|привет\w*|друзья[!.,:]?|коллег\w*|читател\w*|а\s+вы\b|"
    r"спешим|напоминаем|обратите\s+внимание|факультеты,?\s+на\s+старт|"
    r"\d{1,2}\s+ноября,?\s+в\s+эту|"
    r"экономический\s+клуб\s+мгимо|"
    r"расписание\s+мероприятия)\b",
    re.I,
)

JUNK = re.compile(
    r"(афиша:\s*куда\s+пойти|куда\s+пойти\s+любителю|"
    r"итоги:\s*как\s+прошла\s+эта\s+неделя|"
    r"подборка\s+самых\s+интересных|"
    r"мем\b|крипт|день\s+рожден|с\s+днём\s+рожден|"
    r"закрепл[её]нн)",
    re.I,
)

RECAP_ONLY = re.compile(
    r"^(как\s+прошёл|как\s+прошла|итоги\b|подводим\s+итоги|"
    r"что\s+было\s+на\s+неделе)",
    re.I,
)

EVENT_HINT = re.compile(
    r"(лекци|семинар|встреч|модел[ьи]|битв[аеуы]|турнир|кубок|матч|"
    r"конферен|школ[аыуе]|завтрак|концерт|спектакл|воркшоп|мастер[- ]?класс|"
    r"дебат|debate|хакатон|квиз|викторин|форум|open\s*talk|book\s*talk|"
    r"открыт(ый|ая)\s+(семинар|диалог|лекци)|регистрац\w*\s+на|приглаша|"
    r"\bvs\b|полонез|бал\b|репетиц|сбор\b|игр[аыуе]\s*«|проходит\s+игра|"
    r"состоится|пройд[её]т|анонс|round\s+of\s+debate|"
    r"conversa[cç][aã]o|clube\s+de\s+convers)",
    re.I,
)

QUOTED = re.compile(r"[«\"]([^»\"]{8,90})[»\"]")
TOPIC = re.compile(
    r"(?:на\s+тему|по\s+теме|тема[:\s]+)\s*[«\"]?([^»\"\n.]{8,100})",
    re.I,
)
DATE_RU = re.compile(
    r"(\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|"
    r"сентября|октября|ноября|декабря)(?:\s+\d{4})?|"
    r"\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|"
    r"сегодня|завтра|в\s+этот\s+(?:понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)|"
    r"в\s+(?:понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье))",
    re.I,
)
TIME_RU = re.compile(r"\b([01]?\d|2[0-3])[:.]([0-5]\d)\b")
PLACE = re.compile(
    r"(главн\w*\s+сцен\w*|корпус\s+\w+|ауд(?:итория)?\.?\s*\d+|мгимо|"
    r"зарядье|дом\s+рахманинова|конференц[- ]?зал)",
    re.I,
)

KNOWN = [
    (
        re.compile(
            r"модел[ьи]\s+совета\s+безопасности|модел[ьи].*сб\s*рф|"
            r"участники\s+модели\s+совета",
            re.I,
        ),
        "Модель Совета Безопасности РФ",
    ),
    (
        re.compile(r"битв[аеуы]\s+факультет", re.I),
        "Битва факультетов 2026",
    ),
    (
        re.compile(r"осенн\w*\s+бал|xlvii\s+осеннего\s+бала", re.I),
        "XLVII Осенний бал МГИМО",
    ),
    (
        re.compile(r"oeconomicus\s+forum|форум\s+oeconomicus", re.I),
        "OECONOMICUS Forum 2026",
    ),
    (
        re.compile(r"бизнес[- ]?завтрак", re.I),
        None,  # title from topic
    ),
    (
        re.compile(r"рахманинов\.?\s*путь\s+домой", re.I),
        "Спектакль «Рахманинов. Путь домой»",
    ),
    (
        re.compile(r"научн\w*\s+школ\w*.*регионоведен", re.I),
        "Научная школа НСО МГИМО и НСО РУДН по регионоведению",
    ),
    (
        re.compile(r"деньги\s+в\s+китае", re.I),
        "Викторина «Деньги в Китае: история и современность»",
    ),
    (
        re.compile(r"вернадск\w*\s+кружк", re.I),
        "Вернадский кружок: земельные выборы в Германии 2026",
    ),
    (
        re.compile(r"хк\s*«?дипломат|хоккейн", re.I),
        "Матч ХК «Дипломаты» МГИМО — ХК «Чёрные вороны» ВШЭ",
    ),
    (
        re.compile(r"камерн\w*\s+музык", re.I),
        "Концерт камерной музыки в Доме Рахманинова",
    ),
]


def clean_ws(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


def clip(s: str, n: int) -> str:
    s = clean_ws(s)
    if len(s) <= n:
        return s
    cut = s[: n - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(".,;:—–- ") + "…"


def first_sentence(text: str) -> str:
    text = clean_ws(text)
    m = re.split(r"(?<=[.!?])\s+", text)
    return m[0] if m else text


def extract_when_where(text: str) -> str:
    bits: list[str] = []
    dm = DATE_RU.search(text or "")
    if dm:
        bits.append(dm.group(0))
    tm = TIME_RU.search(text or "")
    if tm:
        bits.append(f"{int(tm.group(1)):02d}:{tm.group(2)}")
    pm = PLACE.search(text or "")
    if pm:
        bits.append(pm.group(0))
    return " · ".join(bits)


def known_title(blob: str) -> str | None:
    for rx, title in KNOWN:
        if rx.search(blob):
            if title:
                return title
            # business breakfast — pull topic
            tm = TOPIC.search(blob) or QUOTED.search(blob)
            if tm:
                return clip(f"Бизнес-завтрак: {tm.group(1)}", 90)
            return "Бизнес-завтрак Oeconomicus"
    return None


def polish_title(t: str) -> str:
    t = clean_ws(t)
    t = re.sub(r"[📍🔥⭐✨🎉]+", " ", t)
    t = re.sub(r"\bдрузья[!.,:]?\s*", "", t, flags=re.I)
    t = re.sub(
        r"^(?:клуб|сборная|студ(?:енческий)?\s+союз)[^:.]{0,60}:\s*",
        "",
        t,
        flags=re.I,
    )
    t = re.sub(r"^open\s*talk\s+с\s+", "Open Talk с ", t, flags=re.I)
    t = re.sub(r"^olá,\s*pessoal[!!.\s]*", "Разговорный клуб на португальском", t, flags=re.I)
    return clip(clean_ws(t), 90)


def make_title(title: str, body: str, club: str | None) -> str:
    blob = f"{title}\n{body}"
    known = known_title(blob)
    if known:
        return known

    t = clean_ws(title)
    # unfinished invite line
    if re.search(r"на\s+тему\s*$", t, re.I):
        tm = TOPIC.search(body) or QUOTED.search(body)
        if tm:
            return polish_title(tm.group(1))
        return polish_title(first_sentence(body))

    if GREET_TITLE.search(t) or len(t) < 12:
        q = QUOTED.search(blob)
        if q:
            return polish_title(q.group(1))
        tm = TOPIC.search(blob)
        if tm:
            return polish_title(tm.group(1))
        for sent in re.split(r"(?<=[.!?])\s+", clean_ws(body)):
            if len(sent) < 20:
                continue
            if GREET_TITLE.search(sent):
                continue
            if re.match(r"^обратите\s+внимание", sent, re.I):
                continue
            if EVENT_HINT.search(sent) or DATE_RU.search(sent):
                return polish_title(sent)
        return polish_title(first_sentence(body) or t)

    return polish_title(t)


def make_body(title: str, body: str, club: str | None) -> str:
    raw = clean_ws(body)
    if not raw:
        return clip(title, 200)

    # Drop pure greeting openers
    sents = [s for s in re.split(r"(?<=[.!?])\s+", raw) if s.strip()]
    kept: list[str] = []
    for s in sents:
        if GREET_TITLE.search(s) and len(s) < 80:
            continue
        if re.match(r"^(спешим|не\s+упускайте|успейте\s+зарегистри)", s, re.I):
            # keep if it has deadline substance
            if not DATE_RU.search(s) and "регистр" not in s.lower():
                continue
        kept.append(s)
        if len(kept) >= 2:
            break
    text = " ".join(kept) if kept else first_sentence(raw)
    when = extract_when_where(raw)
    # Ensure when/where visible if not already in text
    if when:
        low = text.lower()
        # append missing pieces
        extra = []
        for part in when.split(" · "):
            if part.lower() not in low:
                extra.append(part)
        if extra:
            text = f"{clip(text, 220)} ({', '.join(extra)})"
            return clip(text, 320)
    return clip(text, 280)


def is_event(title: str, body: str) -> tuple[bool, str]:
    blob = f"{title}\n{body}"
    if re.search(r"афиша:\s*куда\s+пойти|куда\s+пойти\s+любителю", blob, re.I):
        return False, "city_afisha_roundup"
    if JUNK.search(title) and not EVENT_HINT.search(blob):
        return False, "junk"
    if RECAP_ONLY.search(title) and not re.search(
        r"приглаша|регистрац|состоится|пройд[её]т", body, re.I
    ):
        return False, "past_recap"
    if known_title(blob):
        return True, "known_event"
    if EVENT_HINT.search(blob):
        if len(clean_ws(body)) < 40 and GREET_TITLE.search(title):
            return False, "empty_greeting"
        return True, "event_signals"
    if DATE_RU.search(blob) and len(clean_ws(body)) > 60:
        return True, "dated_post"
    if GREET_TITLE.search(title) and not EVENT_HINT.search(body):
        return False, "greeting_no_event"
    if QUOTED.search(blob) and len(clean_ws(body)) > 80:
        return True, "quoted_title"
    return False, "no_event_signal"


def curate_row(row: dict) -> dict:
    title = row.get("title") or ""
    body = row.get("body") or ""
    club = row.get("club")
    ok, reason = is_event(title, body)
    if not ok:
        return {
            "id": row["id"],
            "verdict": "REJECTED",
            "reason": reason,
            "title": title,
            "body": body,
        }
    new_title = make_title(title, body, club)
    new_body = make_body(new_title, body, club)
    return {
        "id": row["id"],
        "verdict": "APPROVED",
        "reason": reason,
        "title": new_title,
        "body": new_body,
        "old_title": title,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=Path, required=True)
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--sql", type=Path, help="Write SQL updates")
    args = ap.parse_args()

    rows = json.loads(args.input.read_text())
    updates = [curate_row(r) for r in rows]
    args.output.write_text(json.dumps(updates, ensure_ascii=False, indent=2))

    approved = sum(1 for u in updates if u["verdict"] == "APPROVED")
    rejected = sum(1 for u in updates if u["verdict"] == "REJECTED")
    retitled = sum(
        1
        for u in updates
        if u["verdict"] == "APPROVED" and u.get("old_title") != u["title"]
    )
    print(f"scanned={len(updates)} approved={approved} rejected={rejected} retitled={retitled}")
    print("--- retitle sample ---")
    n = 0
    for u in updates:
        if u["verdict"] == "APPROVED" and u.get("old_title") != u["title"]:
            print(f"{u['old_title'][:55]} → {u['title'][:70]}")
            n += 1
            if n >= 25:
                break
    print("--- reject sample ---")
    n = 0
    for u in updates:
        if u["verdict"] == "REJECTED":
            print(f"{u['reason']}: {u['title'][:70]}")
            n += 1
            if n >= 15:
                break

    if args.sql:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        lines = ["BEGIN;"]
        for u in updates:
            title = u["title"].replace("'", "''")
            body = (u["body"] or "").replace("'", "''")
            lines.append(
                "UPDATE \"EventCandidate\" SET "
                f"\"moderationStatus\" = '{u['verdict']}', "
                f"\"moderatedAt\" = TIMESTAMP '{now}', "
                f"title = '{title}', "
                f"body = '{body}' "
                f"WHERE id = '{u['id']}';"
            )
        lines.append("COMMIT;")
        args.sql.write_text("\n".join(lines) + "\n")
        print(f"wrote {args.sql}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
