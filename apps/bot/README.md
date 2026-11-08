# @dekanat/bot — Telegram AI cabinet

## Auth
1. **Phone (preferred):** share Telegram contact — number must match `User.phoneE164`.
2. Fallback: `/login email password`

Demo phones (seed): `+79001111111` Anna · `+79002222222` Boris · `+79003333333` staff.

## AI
After login, free-text messages go to z.ai (`ZCODE_*`) with **cabinet tools** (same as MCP):
schedule, grades, requests, notifications, AI1–AI3, staff queue.

## Env
- `TELEGRAM_BOT_TOKEN` — **dedicated** BotFather token (not Hermes gateway)
- `API_URL`, `ZCODE_API_KEY`, `ZCODE_BASE_URL`, `ZCODE_MODEL`

```bash
pnpm --filter @dekanat/bot dev
```

## MCP
See `apps/mcp` — same tools over stdio for Cursor/Claude.
