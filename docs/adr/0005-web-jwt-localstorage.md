# 0005. Web JWT: localStorage + Bearer

## Статус
Принято

## Дата
2026-11-08

## Контекст
Web PWA нужен быстрый auth к Nest API. Cookie BFF через Next route handlers добавляет поверхность и время на scaffold.

## Решение
Хранить access JWT в `localStorage` (`dekanat_access_token`) и слать `Authorization: Bearer` из `apps/web/src/lib/api.ts`. Профиль — рядом в `dekanat_user`.

## Последствия
- (+) Проще отладка и мобильный клиент с тем же API
- (−) XSS может украсть токен; для post-contest рассмотреть httpOnly cookie + SameSite
