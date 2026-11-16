# Process log — 2026-11-16 · реальный TG-дайджест

## Триггер
Owner: «Это же выдуманно?» → «ТАК А ХУЛИ НЕ РЕАЛЬНЫЕ???? TG ТО ты можешь стащить».

## Что сделали
- Парсер публичного preview `t.me/s/<channel>` (без Bot API).
- `syncTelegramDigest` → upsert APPROVED `EventCandidate` по URL поста; retire seed stub'ов.
- Staff `POST /staff/digest/ingest-telegram` + кнопка на `/staff/clubs`.
- Worker cron / `--digest-tg` → in-process Prisma ingest (no public `/internal` key).
- Security: removed shared-secret public ingest endpoint; Caddy blocks `/internal*`.
- ADR 0017, DEMO/CHANGELOG copy.

## Проверка сети (агент)
- `studsouzmgimo` / `nsomgimo` / `MGIMO_Diplomatic_club` — свежие посты за 2026-11.
- `mgimo_digest` — канал жив, но редкий (не клубовый реестр).

## Не сделали
- VK scrape (токен).
- Bot API / TELEGRAM_PROXY для ingest (не нужен для public preview).
