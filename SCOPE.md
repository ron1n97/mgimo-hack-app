# SCOPE LOCK — Деканат+ (long platform)

Updated: 2026-11-08 · Owner: long-horizon, all surfaces

См. `docs/OWNER_DECISIONS.md`, `docs/adr/0003-long-horizon-all-surfaces.md`.

## Горизонт
Делаем **платформу надолго**. Сдача конкурса 22.11 = важный релиз, не потолок.

## Y — строим
- Web + **PWA**
- **Mobile** (кроссплатформа, один код)
- **Telegram bot**
- Auth: регистрация + логин (нормальная схема)
- Postgres + Redis + workers в **Docker Compose** (+ путь к CI deploy)
- Расписание МГИМО: sync групп через RUZ
- Успеваемость, заявки/справки+статус, уведомления
- In-product AI (AI1–AI3) через **Z Code / OpenRouter-compatible**
- Кабинет **студента и сотрудника**
- Боли + критерии + process-log + CHANGELOG
- Конкурсный дисклеймер, fake PII в демо-данных, без лого вуза

## N — всё ещё нельзя
- Реальные ПДн / боевые логины вуза
- Официальный логотип МГИМО
- Секреты в git
- SQLite как основная БД
- Sole Vercel/Railway как единственный прод для жюри из РФ

## Релизы
Режем на рабочие куски в `CHANGELOG.md`. Не «один коммит = весь мир».
