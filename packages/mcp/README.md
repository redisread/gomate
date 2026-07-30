# @gomate/mcp

GoMate MCP server — stub phase.

## Status

**Stub阶段** — 所有工具返回 mock data，真实逻辑待 #230/#231 实现。

## Transports

### stdio (Claude Desktop / CLI)

```bash
pnpm --filter @gomate/mcp dev
```

启动后 JSON-RPC over stdin/stdout。

### Worker HTTP (Cloudflare Workers)

`POST /v1/mcp` — JSON-RPC over HTTPS。

Workers.dev 部署：`wrangler deploy`

## Tools (10 stubs)

| Tool              | Description                          |
| ----------------- | ------------------------------------ |
| `list_teams`      | List teams with optional city filter |
| `get_team`        | Get a single team by ID              |
| `list_locations`  | List locations with optional filters |
| `get_location`    | Get a single location by ID          |
| `list_stories`    | List stories for a team              |
| `my_status`       | Get current user's status            |
| `create_team`     | Create a new team                    |
| `join_team`       | Join an existing team                |
| `create_location` | Create a new location                |
| `publish_story`   | Publish a story for a team           |

## Scripts

```bash
pnpm --filter @gomate/mcp build      # TypeScript compile
pnpm --filter @gomate/mcp lint       # ESLint
pnpm --filter @gomate/mcp dev        # stdio server (dev)
pnpm --filter @gomate/mcp typecheck  # Type check
```

## P3 任务依赖

- #228 ✅ 包骨架（已合）
- #229 → server 入口（当前任务）
- #230 → 读工具 stub（依赖 #229）
- #231 → 写工具 stub（依赖 #229）
- #232 → 防幻觉三闸门（依赖 #230/#231）
