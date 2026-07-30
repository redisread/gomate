// Cloudflare Worker entry — HTTP transport for /v1/mcp
// Deploy via wrangler

import { listTeams } from './tools/read/list-teams.js';
import { getTeam } from './tools/read/get-team.js';
import { listLocations } from './tools/read/list-locations.js';
import { getLocation } from './tools/read/get-location.js';
import { listStories } from './tools/read/list-stories.js';
import { myStatus } from './tools/read/my-status.js';
import { createTeam } from './tools/write/create-team.js';
import { joinTeam } from './tools/write/join-team.js';
import { createLocation } from './tools/write/create-location.js';
import { publishStory } from './tools/write/publish-story.js';

interface Env {
  API_BASE_URL?: string;
  API_KEY?: string;
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    if (request.method !== 'POST' || !request.url.endsWith('/v1/mcp')) {
      return new Response('Not Found', { status: 404 });
    }

    const rpc = await request.json() as { id: unknown; method: string; params?: { name?: string; arguments?: Record<string, unknown> } };
    const response = await handleJsonRpc(rpc);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

async function handleJsonRpc(rpc: { id: unknown; method: string; params?: { name?: string; arguments?: Record<string, unknown> } }) {
  const { id, method, params } = rpc;

  try {
    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: getToolList() };
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params ?? {};
      const result = await callTool(name!, args ?? {});
      return { jsonrpc: '2.0', id, result };
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
  } catch (error) {
    return { jsonrpc: '2.0', id, error: { code: -32000, message: String(error) } };
  }
}

function getToolList() {
  return {
    tools: [
      { name: 'list_teams', description: 'List teams with optional city filter', inputSchema: { type: 'object', properties: { cityId: { type: 'string' }, pageSize: { type: 'number' }, cursor: { type: 'string' } } } },
      { name: 'get_team', description: 'Get a single team by ID', inputSchema: { type: 'object', properties: { teamId: { type: 'string' } }, required: ['teamId'] } },
      { name: 'list_locations', description: 'List locations with optional filters', inputSchema: { type: 'object', properties: { cityId: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, difficulty: { type: 'string' }, pageSize: { type: 'number' }, cursor: { type: 'string' } } } },
      { name: 'get_location', description: 'Get a single location by ID', inputSchema: { type: 'object', properties: { locationId: { type: 'string' } }, required: ['locationId'] } },
      { name: 'list_stories', description: 'List stories for a team', inputSchema: { type: 'object', properties: { teamId: { type: 'string' }, pageSize: { type: 'number' }, cursor: { type: 'string' } } } },
      { name: 'my_status', description: "Get current user's status", inputSchema: { type: 'object', properties: {} } },
      { name: 'create_team', description: 'Create a new team', inputSchema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, locationId: { type: 'string' }, scheduledDate: { type: 'string' }, maxMembers: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['name', 'locationId', 'scheduledDate'] } },
      { name: 'join_team', description: 'Join an existing team', inputSchema: { type: 'object', properties: { teamId: { type: 'string' }, message: { type: 'string' } }, required: ['teamId'] } },
      { name: 'create_location', description: 'Create a new location', inputSchema: { type: 'object', properties: { name: { type: 'string' }, cityId: { type: 'string' }, address: { type: 'string' }, latitude: { type: 'number' }, longitude: { type: 'number' }, difficulty: { type: 'string', enum: ['easy', 'moderate', 'hard'] }, tags: { type: 'array', items: { type: 'string' } } }, required: ['name', 'cityId', 'latitude', 'longitude', 'difficulty'] } },
      { name: 'publish_story', description: 'Publish a story for a team', inputSchema: { type: 'object', properties: { teamId: { type: 'string' }, content: { type: 'string' }, images: { type: 'array', items: { type: 'string' } } }, required: ['teamId', 'content'] } },
    ],
  };
}

async function callTool(name: string, args: Record<string, unknown>) {
  let result: unknown;

  switch (name) {
    case 'list_teams': result = await listTeams(args as Parameters<typeof listTeams>[0]); break;
    case 'get_team': result = await getTeam(args as Parameters<typeof getTeam>[0]); break;
    case 'list_locations': result = await listLocations(args as Parameters<typeof listLocations>[0]); break;
    case 'get_location': result = await getLocation(args as Parameters<typeof getLocation>[0]); break;
    case 'list_stories': result = await listStories(args as Parameters<typeof listStories>[0]); break;
    case 'my_status': result = await myStatus(args as Parameters<typeof myStatus>[0]); break;
    case 'create_team': result = await createTeam(args as Parameters<typeof createTeam>[0]); break;
    case 'join_team': result = await joinTeam(args as Parameters<typeof joinTeam>[0]); break;
    case 'create_location': result = await createLocation(args as Parameters<typeof createLocation>[0]); break;
    case 'publish_story': result = await publishStory(args as Parameters<typeof publishStory>[0]); break;
    default: throw new Error(`Unknown tool: ${name}`);
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}
