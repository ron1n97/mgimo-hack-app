# 0016. Digest ingest (VK wall + durable seed; no TG scrape)

## Статус
Принято

## Дата
2026-11-16

## Контекст
Лента клубов на `/today` и `/clubs` жила на stub `EventCandidate` без live TG/VK scrape. Telegram-бот как продукт отменён — каналный scrape через bot API не возвращаем. Нужен (1) устойчивый демо-seed на текущую московскую неделю со ссылками на VK/TG клубов и (2) опциональный worker-ingest публичных VK-стен при наличии сервисного токена.

## Решение
1. **Seed `seedDigestNewsFeed`** — идемпотентные одобренные `EventCandidate` с заголовками `Дайджест: …`, `startsAt` относительно текущей MSK-недели (в т.ч. «сегодня»), `url`/`sourceId` из `ClubSource` (VK предпочтительно, иначе Telegram/website). Вызывается из полного seed и `seed:extras`.
2. **Worker job `ingestDigest`** (`DIGEST_INGEST_CRON`, boot + `--digest-once`):
   - если `VK_SERVICE_TOKEN` задан — `wall.get` по enabled `ClubSource` kind=VK → новые кандидаты со статусом **PENDING** (модерация staff, ADR 0012);
   - без токена — no-op + лог;
   - TELEGRAM sources — skip **в этом job**; live scrape публичных каналов — **ADR 0017** (`t.me/s`, без Bot API);
   - WEBSITE/RSS — out of this slice (лог skip; можно расширить отдельно).
3. Дедуп live-постов по `EventCandidate.url` (`https://vk.com/wall{owner}_{id}`).
4. UI AI-чата: hint «обычно 15–30 сек» при ожидании Z Code.

## Последствия
+ Демо-лента не «застывает» на дне первого seed; tip-cut может обновить даты через `seed:extras`.
+ Live VK возможен без Telegram egress; токен только в `.env` / `PROD_ENV`.
− Без `VK_SERVICE_TOKEN` на VPS ingest остаётся seed-only.
− TG-каналы в реестре остаются как ссылки для студента, не как scrape-источник.
− Cloud agent без SSH на VPS: merge + document tip-cut; deploy/seed на live — локально/CI.

## Связанное
- Live Telegram public preview scrape — **ADR 0017** (пересмотр skip TG из этого ADR).
