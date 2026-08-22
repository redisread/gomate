import { middleware, pages } from "astro/hono";
import { cf } from "@astrojs/cloudflare/hono";
import { apiApp, type ApiBindings } from "./server/app";
import { Hono, type Context } from "hono";

const worker = new Hono<{ Bindings: ApiBindings }>();

worker.use("*", async (c, next) => {
  await next();
  const versionId = c.env.CF_VERSION_METADATA?.id;
  if (versionId) {
    const response = new Response(c.res.body, c.res);
    response.headers.set("X-Worker-Version-ID", versionId);
    c.res = response;
  }
});

worker.route("/api", apiApp);

function apiNotFound(c: Context<{ Bindings: ApiBindings }>) {
  return c.json(
    {
      success: false as const,
      error: { code: "NOT_FOUND", message: "Not found" },
    },
    404,
  );
}

worker.all("/api", apiNotFound);
worker.all("/api/*", apiNotFound);

// Astro's Cloudflare context is only needed by the page renderer. Keeping it
// after the API boundary lets JSON requests stay independent of Astro's page
// manifest in local workerd and production.
worker.use("*", cf());
worker.use("*", middleware());
worker.use("*", pages());

export default worker;
