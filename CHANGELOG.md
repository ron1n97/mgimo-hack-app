# Changelog

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/) + semver для прототипа конкурса.  
Каждый заметный срез продукта = запись здесь **и** при необходимости `docs/releases/vX.Y.Z.md`.

## [Unreleased]

### Added
- Live clubs digest from public Telegram channel previews (`t.me/s/…`, ADR 0017): staff ingest button, worker cron, internal key endpoint; demo stubs retired only after successful ingest.
- Durable MSK-week digest news seed (`seedDigestNewsFeed`) + worker `ingestDigest` for VK walls when `VK_SERVICE_TOKEN` is set (ADR 0016)

### Fixed
- `/clubs` weekly/today digest no longer empty without subscriptions (public stub feed).
- Demo club «сегодня» stubs refresh `startsAt` on `seed:extras` (Moscow noon).
- PWA SW no longer caches API 401s that bounced JWT sessions to login.
- Digest feed orders newest posts first so TG ingest is visible on `/clubs`.

### Changed
- TG digest cards: parse event time from post text, short description, optional photo (`imageUrl`); `startsAt` prefers event time over publish time.
- `/clubs`: digest is the default tab (today / week / interests); catalog is a separate tab so the feed is not buried under the club list.
- Student academic profile fields are read-only (seed-bound); today hub shows club digest; PWA install hint + SW registration without PushManager gate.
- Demo seed: five fictional students across faculties; clubs daily/weekly digest stubs (fallback until TG ingest runs).
- AI chat shows «обычно 15–30 сек» while waiting on Z Code.

### Added
- Telegram egress proxy for RU VPS (undici `TELEGRAM_PROXY`, ADR 0007) + keepalive script
- RUZ subgroup preference + lessonOid upsert + DB-first schedule SoT (ADR 0008/0009)
- Clubs registry, digest sources, tags, interest subscriptions (ADR 0012)
- PWA Web Push subscriptions + phone prompt (ADR 0013)
- Teacher cabinet / lesson assignments + tasks (ADR 0010)
- Timetable optimization research (md + GOST docx, OR-Tools note, ADR 0011)
- Liquid-glass role-aware mobile bottom nav
- Profile role group picker: staff/admin any catalog group vs student own+subgroup (ADR 0015)
- Demo quick-login personas (ADR docs/DEMO.md); in-app AI assistant + widget DSL (ADR 0014)
- Caddy HTTPS fronts for sslip.io web/API hosts
- Iron Ring project overlay (`.cursor/skills/ironring/`)
- Process log: `docs/process-log/ironring-batch-2026-11-10-11.md`

### Fixed
- Web build after merge (`addDigestSource` cut, teacher AI suggestions)
- Nest `dist/main.js` path; bot image deps; worker Prisma generate (earlier Nov 10)
- AI draft honesty (no silent stub); GOST Word export; phone-login bot UX

### Notes
- 2026-11-11: feature branches merged to `main` (tip includes `cbc6674` + process-log commit). VPS tip publish paused after OOM / multi-agent image race — see `docs/process-log/ironring-batch-2026-11-10-11.md`.

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
