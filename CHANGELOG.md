# Changelog

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/) + semver для прототипа конкурса.  
Каждый заметный срез продукта = запись здесь **и** при необходимости `docs/releases/vX.Y.Z.md`.

## [Unreleased]

### Added
- Research pack + ideal backlog (2026-11-08)

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
