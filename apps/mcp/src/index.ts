#!/usr/bin/env node
/**
 * Деканат+ MCP (stdio) — tools over live API with Bearer JWT.
 *
 * Env:
 *   API_URL / DEKANAT_API_URL
 *   DEKANAT_ACCESS_TOKEN  (required) — from /auth/login or /auth/login-phone
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  CABINET_TOOL_DEFINITIONS,
  CabinetClient,
  executeCabinetTool,
} from '@dekanat/cabinet-tools';

const apiUrl =
  process.env.DEKANAT_API_URL?.trim() ||
  process.env.API_URL?.trim() ||
  'http://localhost:3001';
const token = process.env.DEKANAT_ACCESS_TOKEN?.trim();

if (!token) {
  console.error(
    '[dekanat-mcp] DEKANAT_ACCESS_TOKEN is required (login via API first).',
  );
  process.exit(1);
}

const client = new CabinetClient({ apiUrl, accessToken: token });

const server = new Server(
  { name: 'dekanat-plus', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: CABINET_TOOL_DEFINITIONS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    inputSchema: t.function.parameters,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  try {
    const result = await executeCabinetTool(client, name, args);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [{ type: 'text' as const, text: message }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[dekanat-mcp] ready api=${apiUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
