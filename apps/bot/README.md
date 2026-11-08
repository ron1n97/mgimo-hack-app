# @dekanat/bot — reactive AI agent (Telegram)

## How smart is it?

Not a FAQ chat. **Bounded tool-calling agent** on z.ai `glm-5.3` with the **same tool catalog as MCP** (`@dekanat/cabinet-tools`).

Modern bits (2026 practice):

| Layer | Behavior |
|-------|----------|
| Reads | Autonomous (`get_*`, AI draft/explain) |
| Writes | **HITL** — inline Confirm/Deny before API side effect |
| Memory | Last ~6 user/assistant turns (`/reset` clears) |
| Loop | Multi-round tools + truncated results + live status edits |
| Policy | Risk at tool boundary (`policy.ts`), not «пожалуйста не пиши» in the prompt |
| MCP | `apps/mcp` stdio for Cursor/Claude; bot uses the same definitions/executor |

## Auth
Share contact (phone = `User.phoneE164`) or `/login email password`.

Demo: `+79001111111` Anna · `+79002222222` Boris · `+79003333333` staff.

## Run
```bash
pnpm --filter @dekanat/bot dev
```
