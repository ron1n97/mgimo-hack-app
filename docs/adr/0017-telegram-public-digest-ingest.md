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
- Upsert `EventCandidate` по уникальному `url` (`https://t.me/<channel>/<id>`), статус **APPROVED** (digestEnabled = staff-gate).
- Карточка дайджеста: короткий title/body, опциональный `imageUrl` (photo wrap CDN), `startsAt` = дата/время события из текста (`23 ноября в 16:00`, `завтра в 18:00`, …) иначе время публикации.
- Уже **REJECTED** посты не переутверждаем.
- Staff (JWT): `POST /staff/digest/ingest-telegram`.
- Worker: in-process Prisma ingest (`syncTelegramDigestLocal`) — **без** публичного `/internal/*` shared-secret endpoint.
- Caddy: `handle /internal*` → 404 на API vhost (defense in depth).
- Retire seed-stub заголовков `Демо:` / `Демо-событие:` / `Новость:` **только если** `postsUpserted > 0`.
- Public feed = MSK week; interest feed = 21d + SQL filter by subscriptions.
- Окно свежести ~21 день; ~8 постов на источник.

## Последствия
- Лента зависит от сети до `t.me` с api/worker; при блоке stubs остаются.
- VK live — ADR 0016 (`VK_SERVICE_TOKEN`).
- Auto-approve TG ослабляет кабинет модерации: gate = digestEnabled.
- Worker и API держат копии parse/ingest модулей — менять оба при правках парсера.
