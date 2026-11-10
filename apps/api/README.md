# @dekanat/api — Деканат+

NestJS 10 + Prisma 5 + PostgreSQL API for the MGIMO×AI Challenge demo.

**Disclaimer:** contest / fictional data only. Not an official MGIMO service.

## Quick start

From monorepo root:

```bash
cp -n .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm --filter @dekanat/api exec prisma migrate dev --name init
pnpm --filter @dekanat/api run seed
pnpm --filter @dekanat/api run start:dev
```

API: `http://localhost:3001`

## Scripts

| Script       | Description              |
|-------------|--------------------------|
| `build`     | Compile NestJS           |
| `start`     | Start once               |
| `start:dev` | Watch mode               |
| `test`      | Jest unit tests          |
| `seed`      | Load demo users / data   |

## Demo accounts

Password for all: `Demo123!`

| Email                 | Role    | Notes              |
|-----------------------|---------|--------------------|
| `anna.risk@demo.local`| student | academic risk      |
| `boris.ok@demo.local` | student | calm / no debts    |
| `staff@demo.local`    | staff   | request queue      |

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /schedule/me?from&to`, `GET /schedule/groups/:ruzId`
- `GET /grades/me`
- `GET|POST /requests`, `GET /requests/:id` (own only)
- `GET /staff/requests`, `PATCH /staff/requests/:id` (staff/admin)
- `GET /notifications/me`
- `GET /today/me`
- `POST /ai/draft-request`, `/ai/next-actions`, `/ai/explain-notification`, `/ai/chat`

Auth: `Authorization: Bearer <JWT>`.

AI uses OpenAI-compatible `ZCODE_*` env; stubs when `ZCODE_API_KEY` is empty.

## Env

See `.env.example` (local) and repo-root `.env.example`. Requires `DATABASE_URL` (Postgres — no SQLite).
