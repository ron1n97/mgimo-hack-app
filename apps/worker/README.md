# @dekanat/worker — RUZ sync

Pulls MGIMO schedule from public RUZ API into Postgres `ScheduleLesson`.

## How sync works

1. **Discover groups** — `GET /api/search?term=XXX&type=group` for faculty prefixes (`МО`, `МЭО`, `МП`, `ТЭО`, `МЖ`, …) and short Cyrillic letters.
2. **Dedupe** by group id.
3. **Fetch schedule** — for each group, `GET /api/schedule/group/{id}?start=YYYY.MM.DD&finish=YYYY.MM.DD` for **current week + next week** (Mon–Sun × 2).
4. **Upsert** into Postgres via Prisma (`ScheduleLesson`, unique on `ruzExternalId + groupRuzId + date + begin`).
5. **Schedule** — `node-cron` with `RUZ_SYNC_CRON` (default every 6 hours). Also runs once on process start.

If Prisma / DB is unavailable, the worker falls back to writing a JSON dump under `/tmp` and logs a TODO.

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `DATABASE_URL` | — | Postgres (same as API) |
| `RUZ_BASE_URL` | `https://ruz.mgimo.ru` | RUZ host |
| `RUZ_SYNC_CRON` | `0 */6 * * *` | Cron expression |
| `RUZ_SYNC_DRY_RUN` | — | `1` = skip DB, collect JSON |

## Commands

```bash
# from monorepo root
pnpm --filter @dekanat/worker prisma:generate   # uses apps/api/prisma/schema.prisma
pnpm --filter @dekanat/worker dev               # cron + boot sync
pnpm --filter @dekanat/worker sync:once         # one-shot
pnpm --filter @dekanat/worker fetch:json        # no DB → /tmp JSON
```

## Docker

Built from repo root (`docker-compose` service `worker`). Shares `DATABASE_URL` with API.
