# Changelog

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/) + semver для прототипа конкурса.  
Каждый заметный срез продукта = запись здесь **и** при необходимости `docs/releases/vX.Y.Z.md`.

## [Unreleased]

### Added
- RUZ subgroup preference + lessonOid upsert + DB-first schedule SoT (ADR 0008/0009)
- Staff/admin schedule view group vs student enrollment; teacher profile gates (ADR 0015)
- Teacher lesson assignments / tasks cabinet (ADR 0010)
- Clubs registry, digest sources, tags, interest subscriptions (ADR 0012)
- PWA Web Push subscriptions + prompt UI (ADR 0013; needs VAPID on VPS)
- Liquid-glass role-aware mobile bottom nav
- Demo passwordless quick-login for contest personas
- In-app AI assistant chat + widget DSL (ADR 0014)
- Caddy HTTPS sslip.io fronts for web + API
- Telegram egress via TELEGRAM_PROXY / undici on RU VPS (ADR 0007)
- Timetable optimization research model (md + GOST docx, ADR 0011)
- Iron Ring project overlay (`.cursor/skills/ironring/`)
- Process log: `docs/process-log/ironring-batch-2026-11-10-11.md`

### Notes
- 2026-11-11: all feature branches merged to `main` (`cbc6674`); VPS tip publish paused after OOM / multi-agent image race — see process log.

## [0.1.0] — 2026-11-08

### Added
- Monorepo: `api` (Nest+Prisma), `web` (Next PWA), `mobile` (Expo), `bot`, `worker` (RUZ), `shared`
- Docker Compose: postgres, redis, api, web, worker (+ bot profile)
- Auth JWT, seed demo users, Today/schedule/grades/requests/notifications/staff/AI stubs
- Unit tests (12) + IDOR smoke (cross-user request → 404)
- ADR 0004 stack

### Notes
- Demo passwords in README; fictional PII only
- Z Code key via env when available

## [0.0.0] — 2026-11-04

### Added
- Docs foundation / strategy
