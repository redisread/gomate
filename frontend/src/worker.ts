import { handle } from "@astrojs/cloudflare/handler";
import { apiApp, type ApiBindings } from "@gomate/api/app";
import { Hono, type Context } from "hono";

const worker = new Hono<{ Bindings: ApiBindings }>();

worker.route("/api", apiApp);

function apiNotFound(c: Context<{ Bindings: ApiBindings }>) {
  return c.json(
    {
      success: false as const,
      error: { code: "NOT_FOUND", message: "Not found" },
    },
    404
  );
}

worker.all("/api", apiNotFound);
worker.all("/api/*", apiNotFound);

worker.all("*", (c) => {
  // Hono 4.12 models `exports` as optional, while current workerd requires it.
  // Cloudflare supplies the complete ExecutionContext to Hono at runtime.
  const executionContext = c.executionCtx as unknown as Parameters<typeof handle>[2];
  return handle(c.req.raw, c.env, executionContext);
});

export default worker;
