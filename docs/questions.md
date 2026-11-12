# Открытые вопросы

| # | Вопрос | Статус | Ответственный | Дата |
|---|--------|--------|---------------|------|
| Q1 | Запустить R-SURVEY (форма + пост в группу) | open | Максим/Роман | 2026-11-04 |
| Q1b | Провести R-FG (фокус-группа), записать протокол | open | оба | 2026-11-04 |
| Q2 | LLM | **closed** — Z Code, OpenRouter-compatible | Роман | 2026-11-08 |
| Q3 | Кабинет сотрудника | **closed** — нужен | Роман | 2026-11-08 |
| Q4 | Хост | **closed** — live HTTPS на `sslip.io` (web + api), VPS `177.177.212.34`, Caddy LE | Роман | 2026-11-12 |
| Q5 | Горизонт / поверхности | **closed** — long; web+mobile (+tg historically); см. Q5b | Роман | 2026-11-08 |
| Q5b | Telegram-бот как поверхность сдачи | **cancelled** owner 2026-11-12 — без bot / TELEGRAM_PROXY / gost egress на VPS | Роман | 2026-11-12 |
| Q6 | RUZ sync всех групп | **closed** — да | Роман | 2026-11-08 |
| Q7 | Z Code base URL + модель (когда дашь ключ) | open — ключ на VPS есть (`ZCODE_*`), smoke `/ai/chat` → `source:zcode` ок; формально ждать owner-confirm URL/модели для PDF | Роман | 2026-11-12 |

## Live (снимок 2026-11-12)

- Web: https://dekanat.177.177.212.34.sslip.io
- API: https://api.dekanat.177.177.212.34.sslip.io
- Продуктовый IMAGE на api/web: `ebc7780f902a` (tip-cut на `5fadc9d` docs-heavy — пропущен)
- Clubs: ~97
- Worker RUZ: поднят (`unless-stopped`); bot контейнер не стартуем
