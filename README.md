# Деканат+ — MGIMO×AI · Вайб-кодинг

Платформа личного кабинета студента / сотрудника (концепт конкурса, **не** официальный сервис вуза).

## Стек

| App | Стек |
|-----|------|
| `apps/api` | NestJS + Prisma + Postgres + JWT |
| `apps/web` | Next.js 15 PWA |
| `apps/mobile` | Expo |
| `apps/bot` | Grammy (Telegram) |
| `apps/worker` | RUZ MGIMO sync |
| `packages/shared` | zod DTOs |

Всё поднимается через **Docker Compose** (postgres, redis, api, web, worker; bot — profile).

## Быстрый старт (локально)

```bash
cp .env.example .env
docker compose up -d postgres redis
cd apps/api && DATABASE_URL='postgresql://dekanat:dekanat@localhost:5432/dekanat?schema=public' pnpm exec prisma migrate deploy
DATABASE_URL='postgresql://dekanat:dekanat@localhost:5432/dekanat?schema=public' pnpm run seed
DATABASE_URL=... JWT_SECRET=dev pnpm run start:dev   # :3001
# другой терминал
cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev  # :3000
```

Или целиком: `pnpm docker:up` (после сборки образов).

## Демо-аккаунты (пароль `Demo123!` — server-side)

Кнопки «Войти как …» на логине, когда API включил `DEMO_QUICK_LOGIN` (см. `docs/DEMO.md`).

| Email | Роль |
|-------|------|
| anna.risk@demo.local | студент (academic risk) |
| boris.ok@demo.local | студент (спокойный) |
| roman.guskov@demo.local | студент |
| teacher@demo.local | преподаватель (STAFF-stub) |
| staff@demo.local | сотрудник |
| admin@demo.local | админ |

## Документы

- `CLAUDE.md` · `SCOPE.md` · `docs/OWNER_DECISIONS.md`
- Ресёрч: `docs/research/ideal-product-backlog.md`
- Бриф для Максима: `docs/partner/strategy-brief.html`

## Тесты

```bash
cd apps/api && pnpm test
```

## Команда

Роман (@ron1n97) · Максим (@adonalsiummax)
