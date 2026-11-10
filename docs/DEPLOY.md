# Deploy (CI/CD)

## Flow
1. **CI** (`.github/workflows/ci.yml`) — Prisma migrate + unit tests on PR/push.
2. **Deploy** (`.github/workflows/deploy.yml`) on `main`:
   - build images → `ghcr.io/ron1n97/mgimo-hack-app/{api,web,worker,bot}`
   - SSH to VPS → bootstrap Docker/swap → write `.env` → `docker compose pull && up -d`

## GitHub Secrets (already set via `gh`)
| Secret | Purpose |
|--------|---------|
| `SSH_PRIVATE_KEY` | deploy key (`~/.ssh/mgimo_hack_app_ed25519`) |
| `SSH_HOST` / `SSH_USER` | VPS |
| `PUBLIC_API_URL` | baked into Next (`NEXT_PUBLIC_API_URL`) |
| `PROD_ENV` | full production `.env` body for `/opt/mgimo-hack-app/.env` |

You normally **don’t** paste secrets by hand — they were set with `gh secret set`
(`SSH_*`, `PUBLIC_API_URL`, `PROD_ENV` with ZCODE + Telegram + DB password).

Images go runner → VPS via `docker save | ssh docker load` (VPS does not need
`read:packages` on a personal PAT).

Live: web `http://SSH_HOST/` · API `http://SSH_HOST:3001`.

## Host layout
- `/opt/mgimo-hack-app/docker-compose.yml` ← `docker-compose.prod.yml`
- `/opt/mgimo-hack-app/.env`
- Web: `http://HOST/` · API: `http://HOST:3001`

## Manual re-deploy
Actions → Deploy → Run workflow

## Telegram bot on RU VPS
`api.telegram.org` is blocked from the VPS. Bot uses `TELEGRAM_PROXY=http://127.0.0.1:40000`
(`network_mode: host`). Port `40000` is an HTTP CONNECT reverse tunnel from a Mac
that can reach Telegram:

- LaunchAgent: `com.dekanat.tg-egress` → `scripts/tg-egress-keepalive.sh`
- See ADR `docs/adr/0007-telegram-egress-proxy.md`

If the Mac sleeps / agent stops — bot cannot poll until the tunnel is back.
