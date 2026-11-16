# Process log — 2026-11-16 · cloud: digest seed + ingestDigest

## Контекст
Локальный агент: live tip-cut дайджеста был news-like stubs на текущую неделю, но коммиты могли не уйти на origin; AI (Z Code) живой, 20–25 с. Пользователь: «продолжи в облаке».

## Сделано (cloud worktree)
- Branch `cursor/digest-ingest-seed-c632`.
- TDD: `digest-news-feed` (MSK-week relative `Дайджест: …` + VK/TG urls) → `seedDigestNewsFeed` в seed / `seed:extras`.
- TDD: worker `ingestDigest` — VK `wall.get` при `VK_SERVICE_TOKEN`, иначе no-op; TELEGRAM sources skip (bot product cancelled).
- ADR `0016-digest-ingest.md`; `.env.example` + compose `VK_SERVICE_TOKEN` / `DIGEST_INGEST_CRON`.
- Web AI chat loading hint: «обычно 15–30 сек (Z Code)».
- `docs/DEPLOY.md` — tip-cut + seed:extras + optional token steps (cloud без SSH на VPS).

## Не сделано / blocked
- `VK_SERVICE_TOKEN` на live — нужен owner в `PROD_ENV`.
- VPS tip-cut / `seed:extras` на dekanat.177.177.212.34.sslip.io — локально или Actions Deploy (cloud agent без SSH).
- TG channel scrape — **не** возвращаем.
- Website RSS ingest — out of slice (ADR 0016).

## Инструменты
Cursor Cloud Agent · pnpm test (api + worker) · ManagePullRequest.
