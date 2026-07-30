#!/usr/bin/env node
// Entry point: runs stdio transport by default (for Claude Desktop / CLI)
// Worker HTTP mode triggered by WRANGLER_ENV=production env var

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('gomate-mcp stdio server started');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
