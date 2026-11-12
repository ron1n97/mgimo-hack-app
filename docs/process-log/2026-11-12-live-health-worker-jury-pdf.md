# Process log — 2026-11-12 · live health, RUZ worker, jury PDF draft

## Owner constraint

Telegram-бот / `TELEGRAM_PROXY` / gost egress / `dekanat-bot` — **не трогаем**. Поверхность сдачи: web/PWA (+ mobile отдельно).

## Live inventory

| Check | Result |
|-------|--------|
| Web `/today` | 200 |
| API host `api.dekanat…sslip.io` `/auth/demo-personas` | 200 |
| Clubs (JWT demo-login) | **97** |
| api/web IMAGE | `ebc7780f902a` |
| `.env` IMAGE_TAG | `5fadc9d836aa` (docs-heavy tip; tip-cut **skipped**) |
| MemAvailable before worker | ~450–470 MiB |
| Bot | `Created`, not started |

## Worker

- `docker compose up -d --no-deps worker` (avoid recreate conflict on existing postgres/redis).
- Image: `worker:5fadc9d836aa`, `restart: unless-stopped`, mem_limit 192m.
- Boot: cron `0 */6 * * *` + sync start; process alive, OOM=false; api stayed 200.
- Tip-cut api/web **не** делали: product delta после `ebc7780` в основном docs (+ seed clubs уже ~97 на live).

## Z Code / AI

- `.env.example`: `ZCODE_API_KEY=` empty placeholder; base/model заданы.
- VPS `.env`: `ZCODE_API_KEY` present (masked `3245…`), base `https://api.z.ai/api/coding/paas/v4`, model `glm-5.3`.
- Smoke: `POST /ai/chat` (persona student-anna) → `source: zcode`, виджеты grades/requests/notifications.

## Docs advanced

- `docs/questions.md` — Q4 closed (sslip live); Q5b Telegram cancelled; Q1/Q1b/Q7 honest.
- `docs/process-log/jury-process-pdf-checklist.md` — заполнен по имеющемуся сырью.
- Draft: `jury-process-draft-2026-11-12.md` + PDF рядом.

## Still blocked (human)

- R-SURVEY / R-FG (Q1/Q1b)
- Owner sign-off критерия 3
- Mobile Expo dogfood / store-ready
- Screenshot pack for final jury PDF
- Optional tip-cut only if product commits after `ebc7780` matter for demo
