# 0009. Notification delivery (in-app SoT + Web Push)

## Статус
Принято

## Дата
2026-11-11

## Контекст
Нужно доставлять digest/grades (и смежные события) на телефон студента. Уже есть in-app `Notification` + `GET /notifications/me`, PWA manifest и precache `sw.js` без push. Telegram-бот и Expo — отдельные поверхности; дублировать fan-out в трёх местах рискованно для MVP.

## Решение
1. **Source of truth** — запись в `Notification` (Postgres). UI и badge читают только её.
2. **Primary fan-out MVP** — Web Push (VAPID) на подписки `PushSubscription` браузера/PWA. Service Worker: `push` + `notificationclick` → `/notifications` или deep link из payload.
3. **Telegram mirror** — позже (тот же dispatcher, отдельный канал), не блокирует PWA.
4. **Expo push** — позже, после стабилизации kinds и SoT.
5. Kinds для push на MVP: `grade_*`, `digest_*` (остальные остаются in-app only, пока не расширим allowlist).
6. Без VAPID env — create уведомления работает, push silently no-op (graceful).

## Последствия
- Нужны `VAPID_*` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, модель подписки, POST/DELETE subscribe, `NotificationDispatcher`.
- iOS Safari: Web Push только для installed PWA на поддерживаемых версиях; Android Chrome — основной путь демо.
- Seed/demo create может писать `grade_*` / `digest_*` для проверки доставки.
