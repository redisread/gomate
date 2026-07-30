import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export async function createStdioTransport(_server: unknown): Promise<StdioServerTransport> {
  return new StdioServerTransport();
}
