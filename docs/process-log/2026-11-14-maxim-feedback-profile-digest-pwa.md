# Process log — 2026-11-14 · фидбек Максима (профиль / дайджест / PWA)

Источник: Telegram (скрины голосовых + текст) + исследовательский HTML-дашборд
опроса (`dashboard_e_dekanat_mgimo.html`) как UX-ориентир «главное на первом экране»,
не как замена apps/web.

## Что просили

1. Мероприятия клубов / дайджест на «Сегодня» (+ недельная сводка).
2. Профиль студента: направление, программа, курс, группа, языковая подгруппа —
   не free-edit; данные из базы; расписание по привязке.
3. ~5 вымышленных студентов с разных факультетов для dogfood.
4. В клубах — ежедневный «что сегодня» и недельный дайджест (stub OK).
5. PWA install prompt на сервере не показывается — починить installability + hint.

## Что сделали в продукте

- API: `STUDENT_IMMUTABLE_FIELDS` — PATCH отклоняет академические поля у студента.
- Today: `clubEventsToday` + `clubDigestWeek` из одобренных `EventCandidate`.
- Seed/extras: 5 студентов (МО×3, МП, МЭО) + stub-события на сегодня/неделю.
- Web: read-only академический блок в профиле; блоки дайджеста на /today и /clubs.
- PWA: SW регистрируется без требования PushManager; manifest `id`/`scope`/icons;
  in-app `PwaInstallPrompt`; no-cache headers для `sw.js`.

## Вне scope этого прохода

- Telegram-бот / egress — не трогали.
- Live TG/VK ingest клубов — stub-лента.
- Полная замена UI статическим HTML-опросом — нет.

## Проверка

- Unit: `profile-fields`, `today-digest`, demo personas.
- Live: tip-cut api+web после merge; curl web/manifest/sw; demo-login + `/today/me`.


## Live proof (`134b3e019cbb`)

| Check | Result |
|-------|--------|
| Web `/today` | 200 |
| `manifest.webmanifest` / `sw.js` | 200; SW `Service-Worker-Allowed: /`, no-cache |
| Demo personas | 5 students + staff/teacher/admin |
| `PATCH /auth/me` course as student | **400** immutable |
| `/today/me` clubEventsToday | «Демо: что сегодня в клубе» |
| `/today/me` clubDigestWeek | ≥3 items |
| Bot | not started |
| Worker | stopped for RAM during tip-cut |
| IMAGE_TAG | `134b3e019cbb` (api+web) |

CI Deploy compose-up failed on redis name conflict; calm manual `compose up -d --no-deps api web` used instead.
