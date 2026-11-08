# 0004. Monorepo stack (scaffold)

## Статус
Принято — 2026-11-08 (agent, owner: не отвлекать)

## Решение
- pnpm workspaces + Turborepo-light scripts
- `apps/api` — NestJS + Prisma + Postgres + Redis
- `apps/web` — Next.js App Router PWA
- `apps/mobile` — Expo
- `apps/bot` — Grammy (Telegram)
- `apps/worker` — BullMQ RUZ sync
- `packages/shared` — zod types / DTOs
- Docker Compose для всего локально и prod-like

## Почему
Один язык (TS) на всех клиентах + API; Nest/Prisma — стандарт enterprise auth/CRUD; Compose закрывает «никакого ручного развёртывания».
