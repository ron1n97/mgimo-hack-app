# 0017. Telegram public preview ingest for clubs digest

## Статус
Принято

## Дата
2026-11-16

## Контекст
Лента дайджеста на `/today` и `/clubs` жила на seed/stub `EventCandidate`. У ~70 клубов в реестре есть публичные TG-каналы; жюри/капитан ожидают реальные посты. Bot API с RU VPS хрупок (ADR 0007); публичная страница `https://t.me/s/<username>` доступна без токена. ADR 0016 закрыл durable seed + VK; TG scrape вынесен сюда.

## Решение
- Парсить HTML preview `t.me/s/…` (без BotFather token).
- Источники: `ClubSource` kind=`TELEGRAM`, `enabled`, клуб с `digestEnabled` (или source без клуба); до ~120 источников за прогон.
- Upsert `EventCandidate` по уникальному `url` (`https://t.me/<channel>/<id>`), `startsAt` = время поста, статус **APPROVED** (digestEnabled = staff-gate).
- Уже **REJECTED** посты не переутверждаем.
- Staff: `POST /staff/digest/ingest-telegram`; worker → `POST /internal/digest/telegram` с `DIGEST_INGEST_KEY`.
- Retire seed-stub заголовков `Демо:` / `Демо-событие:` / `Новость:` **только если** `postsUpserted > 0`.
- `GET /digest/feed` отдаёт newest-first (`startsAt desc`).
- Окно свежести ~21 день; ~8 постов на источник.

## Последствия
- Лента зависит от сети до `t.me` с api; при блоке stubs остаются (retire не срабатывает).
- VK live — ADR 0016 (`VK_SERVICE_TOKEN`).
- Auto-approve TG ослабляет кабинет модерации: gate = digestEnabled.
