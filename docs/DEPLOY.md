# Deploy (CI/CD)

## Flow
1. **CI** (`.github/workflows/ci.yml`) — Prisma migrate + unit tests on PR/push.
2. **Deploy** (`.github/workflows/deploy.yml`) on `main`:
   - build images → `ghcr.io/ron1n97/mgimo-hack-app/{api,web,worker,bot}`
   - SSH to VPS → bootstrap Docker/swap → write `.env` + `Caddyfile` → `docker compose up -d`

## Live URLs (HTTPS)
| Surface | URL |
|---------|-----|
| Web | https://dekanat.177.177.212.34.sslip.io |
| API | https://api.dekanat.177.177.212.34.sslip.io |

Caddy terminates TLS (Let’s Encrypt) and reverse-proxies `web:3000` / `api:3001`.
Host ports **80/443** only — do not publish `:3000` / `:3001` on the host.

Bake web with:

`PUBLIC_API_URL=https://api.dekanat.177.177.212.34.sslip.io`

## GitHub Secrets (already set via `gh`)
| Secret | Purpose |
|--------|---------|
| `SSH_PRIVATE_KEY` | deploy key (`~/.ssh/mgimo_hack_app_ed25519`) |
| `SSH_HOST` / `SSH_USER` | VPS |
| `PUBLIC_API_URL` | baked into Next (`NEXT_PUBLIC_API_URL`) — must be the **HTTPS API** host |
| `PROD_ENV` | full production `.env` body for `/opt/mgimo-hack-app/.env` |

You normally **don’t** paste secrets by hand — they were set with `gh secret set`
(`SSH_*`, `PUBLIC_API_URL`, `PROD_ENV` with ZCODE + Telegram + DB password).

Images go runner → VPS via `docker save | ssh docker load` (VPS does not need
`read:packages` on a personal PAT).

## Host layout
- `/opt/mgimo-hack-app/docker-compose.yml` ← `docker-compose.prod.yml`
- `/opt/mgimo-hack-app/Caddyfile`
- `/opt/mgimo-hack-app/.env`
- Caddy volumes: `caddy_data`, `caddy_config`

## Demo quick-login on VPS
Set in production `.env` / `PROD_ENV`:

```bash
DEMO_QUICK_LOGIN=true
```

Then `docker compose up -d api` (and `seed:extras` if `teacher@demo.local` missing).
See [`docs/DEMO.md`](DEMO.md). UI reads `GET /auth/demo-personas` — web rebuild
not required just to show the buttons. Deploy workflow also bakes
`NEXT_PUBLIC_DEMO_LOGIN=1` into web images for an explicit client hint.

## Manual re-deploy
Actions → Deploy → Run workflow

## Digest news feed + VK ingest (ADR 0016)
After tip-cut of api/worker (or full deploy):

```bash
# On VPS host (/opt/mgimo-hack-app or compose project dir)
docker compose up -d --no-deps --force-recreate api worker
# Refresh MSK-week seed stubs (titles «Дайджест: …») without wiping RUZ lessons
docker compose exec api sh -lc 'cd /app && node --import tsx prisma/seed-extras.ts' \
  || docker compose exec api pnpm --filter @dekanat/api seed:extras
```

Optional live VK walls — set in `PROD_ENV` / host `.env` then recreate worker:

```bash
VK_SERVICE_TOKEN=...          # service token; absent → ingest no-op + log
DIGEST_INGEST_CRON="30 */6 * * *"
# One-shot: docker compose exec worker node dist/index.js --digest-once
```

Telegram channel scrape is **not** enabled (bot product cancelled). Club TG URLs stay as links in seed/UI only.

## Telegram bot on RU VPS
`api.telegram.org` is blocked from the VPS. Bot uses `TELEGRAM_PROXY=http://127.0.0.1:40000`
(`network_mode: host`). Port `40000` is an HTTP CONNECT reverse tunnel from a Mac
that can reach Telegram:

- LaunchAgent: `com.dekanat.tg-egress` → `scripts/tg-egress-keepalive.sh`
- See ADR `docs/adr/0007-telegram-egress-proxy.md`

If the Mac sleeps / agent stops — bot cannot poll until the tunnel is back.
