# @dekanat/web — Деканат+

Next.js 15 App Router PWA для MGIMO×AI Challenge.

## Auth (выбрано)

**JWT в `localStorage` + заголовок `Authorization: Bearer <token>`.**

Почему не httpOnly cookie BFF: быстрее для contest scaffold, меньше кода на Next route handlers. Минус — XSS-риск; для продакшена позже можно перейти на cookie (см. ADR `docs/adr/0005-web-jwt-localstorage.md`).

Ключи: `dekanat_access_token`, `dekanat_user`.

## Env

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Scripts

```bash
pnpm --filter @dekanat/web dev
pnpm --filter @dekanat/web build
pnpm --filter @dekanat/web start
```

## Демо

- `anna.risk@demo.local` / `Demo123!`
- `boris.ok@demo.local` / `Demo123!`

## API expectations (mock-friendly)

Клиент ясно падает, если API недоступен. Ожидаемые пути:

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, user }` |
| POST | `/auth/register` | `{ email, password, fullName }` |
| GET | `/auth/me` | current user |
| GET | `/today` | hub |
| GET | `/schedule` | array |
| GET | `/grades` | array |
| GET | `/requests` | array |
| POST | `/requests` | create |
| POST | `/ai/draft-request` | `{ type, subject, notes? }` → `{ draft }` |
| POST | `/ai/chat` | `{ message, history? }` → assistant + widget parts |
| GET | `/notifications` | array |
| GET | `/staff/requests` | staff queue |
| PATCH | `/staff/requests/:id` | `{ status }` |
