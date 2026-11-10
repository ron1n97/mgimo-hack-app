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

## Manual re-deploy
Actions → Deploy → Run workflow
