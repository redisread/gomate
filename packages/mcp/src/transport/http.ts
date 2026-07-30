// HTTP transport for Cloudflare Workers — POST /v1/mcp
// Workers runtime: uses standard Request/Response pattern

export interface WorkerEnv {
  API_BASE_URL?: string;
  API_KEY?: string;
}

export function createWorkerHandler(
  handler: (request: Request) => Promise<Response>
) {
  return {
    async fetch(request: Request): Promise<Response> {
      return handler(request);
    },
  };
}
