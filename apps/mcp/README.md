# @dekanat/mcp — Model Context Protocol for Деканат+

Stdio MCP server exposing cabinet tools (schedule, grades, requests, AI1–AI3).

## Auth

1. Login: `POST /auth/login` or `POST /auth/login-phone`
2. Export JWT:

```bash
export DEKANAT_ACCESS_TOKEN='…'
export API_URL=http://localhost:3001
pnpm --filter @dekanat/mcp dev
```

## Cursor / Claude Desktop snippet

```json
{
  "mcpServers": {
    "dekanat-plus": {
      "command": "pnpm",
      "args": ["--filter", "@dekanat/mcp", "dev"],
      "cwd": "/path/to/mgimo-hack-app",
      "env": {
        "API_URL": "http://localhost:3001",
        "DEKANAT_ACCESS_TOKEN": "<jwt>"
      }
    }
  }
}
```

Same tool surface is used by the Telegram AI bot.
