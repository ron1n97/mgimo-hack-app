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

You normally **don’t** paste secrets by hand — agent/owner refreshes with `gh secret set`.

## Host layout
- `/opt/mgimo-hack-app/docker-compose.yml` ← `docker-compose.prod.yml`
- `/opt/mgimo-hack-app/.env`
- Web: `http://HOST/` · API: `http://HOST:3001`

## Manual re-deploy
Actions → Deploy → Run workflow
