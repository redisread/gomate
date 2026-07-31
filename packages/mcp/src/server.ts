import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listTeams } from './tools/read/list-teams.js';
import { getTeam } from './tools/read/get-team.js';
import { listLocations } from './tools/read/list-locations.js';
import { getLocation } from './tools/read/get-location.js';
import { listStories } from './tools/read/list-stories.js';
import { myStatus } from './tools/read/my-status.js';
import { discoverEnums } from './tools/read/discover-enums.js';
import { createTeam } from './tools/write/create-team.js';
import { joinTeam } from './tools/write/join-team.js';
import { createLocation } from './tools/write/create-location.js';
import { publishStory } from './tools/write/publish-story.js';
import { dryRunPreview } from './tools/write/dry-run-preview.js';

export function createServer() {
  const server = new Server(
    {
      name: 'gomate-mcp',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_teams',
          description: 'List teams with optional city filter',
          inputSchema: {
            type: 'object',
            properties: {
              cityId: { type: 'string', description: 'Filter by city ID' },
              pageSize: { type: 'number', description: 'Page size' },
              cursor: { type: 'string', description: 'Pagination cursor' },
            },
          },
        },
        {
          name: 'get_team',
          description: 'Get a single team by ID',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: { type: 'string' },
            },
            required: ['teamId'],
          },
        },
        {
          name: 'list_locations',
          description: 'List locations with optional filters',
          inputSchema: {
            type: 'object',
            properties: {
              cityId: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              difficulty: { type: 'string' },
              pageSize: { type: 'number' },
              cursor: { type: 'string' },
            },
          },
        },
        {
          name: 'get_location',
          description: 'Get a single location by ID',
          inputSchema: {
            type: 'object',
            properties: {
              locationId: { type: 'string' },
            },
            required: ['locationId'],
          },
        },
        {
          name: 'list_stories',
          description: 'List stories for a team',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: { type: 'string' },
              pageSize: { type: 'number' },
              cursor: { type: 'string' },
            },
          },
        },
        {
          name: 'my_status',
          description: "Get current user's membership status in a team",
          inputSchema: {
            type: 'object',
            properties: {
              teamId: { type: 'string', description: 'Team ID to check membership status' },
            },
            required: ['teamId'],
          },
        },
        {
          name: 'discover_enums',
          description: 'Discover valid enum values (cities, difficulty, team_status, tags) to prevent hallucinated values',
          inputSchema: {
            type: 'object',
            properties: {
              enumType: { type: 'string', enum: ['city', 'difficulty', 'team_status', 'tag'] },
            },
            required: ['enumType'],
          },
        },
        {
          name: 'dry_run_preview',
          description: 'Validate write action parameters without executing — returns validation errors or preview',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['create_team', 'join_team', 'create_location', 'publish_story'] },
              parameters: { type: 'object' },
            },
            required: ['action', 'parameters'],
          },
        },
        {
          name: 'create_team',
          description: 'Create a new team',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              locationId: { type: 'string' },
              scheduledDate: { type: 'string' },
              maxMembers: { type: 'number' },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'locationId', 'scheduledDate'],
          },
        },
        {
          name: 'join_team',
          description: 'Join an existing team',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['teamId'],
          },
        },
        {
          name: 'create_location',
          description: 'Create a new location',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              cityId: { type: 'string' },
              address: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              difficulty: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'cityId', 'latitude', 'longitude', 'difficulty'],
          },
        },
        {
          name: 'publish_story',
          description: 'Publish a story for a team',
          inputSchema: {
            type: 'object',
            properties: {
              teamId: { type: 'string' },
              content: { type: 'string' },
              images: { type: 'array', items: { type: 'string' } },
            },
            required: ['teamId', 'content'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'list_teams':
          result = await listTeams(args as Parameters<typeof listTeams>[0], null);
          break;
        case 'get_team':
          result = await getTeam(args as Parameters<typeof getTeam>[0], null);
          break;
        case 'list_locations':
          result = await listLocations(args as Parameters<typeof listLocations>[0], null);
          break;
        case 'get_location':
          result = await getLocation(args as Parameters<typeof getLocation>[0], null);
          break;
        case 'list_stories':
          result = await listStories(args as Parameters<typeof listStories>[0], null);
          break;
        case 'my_status':
          result = await myStatus(args as Parameters<typeof myStatus>[0], null);
          break;
        case 'discover_enums':
          result = await discoverEnums(args as Parameters<typeof discoverEnums>[0], null);
          break;
        case 'dry_run_preview':
          result = await dryRunPreview(args as Parameters<typeof dryRunPreview>[0]);
          break;
        case 'create_team':
          result = await createTeam(args as Parameters<typeof createTeam>[0], null);
          break;
        case 'join_team':
          result = await joinTeam(args as Parameters<typeof joinTeam>[0], null);
          break;
        case 'create_location':
          result = await createLocation(args as Parameters<typeof createLocation>[0], null);
          break;
        case 'publish_story':
          result = await publishStory(args as Parameters<typeof publishStory>[0], null);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: String(error) }),
          },
        ],
        isError: true,
      };
    }
  });

  // Stub: resources and prompts not used in stub phase
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [],
  }));
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [],
  }));

  return server;
}
