# @dekanat/bot — Telegram (Grammy)

## Commands

| Command | Behavior |
|---------|----------|
| `/start` | Disclaimer + demo login help |
| `/login email password` | Demo auth via `POST /auth/login` (not production-ideal) |
| `/today` | `GET /today/me` with Bearer JWT |
| `/schedule` | `GET /schedule/me` |
| `/requests` | `GET /requests/me` |
| `/logout` | Clear in-memory session |

If `TELEGRAM_BOT_TOKEN` is empty, the process exits 0 (Compose profile `bot` can stay off).

## Run

```bash
export TELEGRAM_BOT_TOKEN=...
export API_URL=http://localhost:3001
pnpm --filter @dekanat/bot dev
```
