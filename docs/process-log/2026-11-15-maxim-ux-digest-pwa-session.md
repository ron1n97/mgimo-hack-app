# Process log — 2026-11-15 · Maxim UX: дайджест / PWA / логин

## Вопросы

1. «а дайджест то где?»
2. «И почему баннер не появляется?»
3. «И че меня на страничку логина сбрасывает все время?»

## Ответы (live)

### Дайджест
- **`/today`**: блок «Клубы сегодня» + карточка «Недельный дайджест».
- **`/clubs`**: «Что сегодня» / «Недельный дайджест» — должны показывать **общую** stub-ленту;
  баг: UI звал `?filter=subscribed` → без подписок пусто, хотя `/today/me` отдавал неделю.
- «Сегодня» пустое на выходных, если stub `startsAt` завис на дне первого seed (14.11).

### PWA
- In-app «Установить приложение» есть (web `e682f7e`+). Нативный Chrome banner — платформенный лотерейный.
- Deploy `2bde5ca` (hint на login) падал: VPS disk full.

### Сессия → логин
- Не cookie SameSite. JWT в localStorage + Bearer.
- Корень: SW `dekanat-web-v2` cache-first клал API 401 → `clearSession` → `/`.
- Фикс `e682f7e` / CACHE `dekanat-web-v3` уже на web live. Curl login→/auth/me→navigate: OK.

## Что сделали
- `/clubs`: public feed для today/week + interest feed отдельно.
- seed-clubs: refresh `startsAt` на `seed:extras`.
- Live SQL: stub «Демо: что сегодня в клубе» → 2026-11-15 09:00Z.
- VPS prune images (disk 100% → ~58%).
- Tip-cut api+web на новый tip после push.


## Live tip-cut (`2836c65d421d`)

| Check | Result |
|-------|--------|
| Images streamed | api/web/worker/bot `2836c65d421d` |
| CI `compose up` | **fail** redis name conflict (known) |
| Manual | `compose up -d --no-deps --force-recreate api web` |
| `DEMO_QUICK_LOGIN` | was wiped by PROD_ENV rewrite → restored + `gh secret set PROD_ENV` |
| `/today/me` | today stub + week 4 |
| `/clubs` public digest | «Что сегодня» + «Недельный» без подписок |
| SW | `dekanat-web-v3` |
| Disk prune | 100% → ~58% before tip-cut |

