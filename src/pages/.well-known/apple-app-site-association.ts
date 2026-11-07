import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { WorkerEnv } from "../../server/env";

export const prerender = false;

export const GET: APIRoute = () => {
  const appID = (env as WorkerEnv).IOS_APP_ID;
  const configured = appID && /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/u.test(appID);
  const paths = [
    "/verify-email",
    "/reset-password",
    "/en/verify-email",
    "/en/reset-password",
    "/zh-CN/verify-email",
    "/zh-CN/reset-password",
  ];
  return new Response(
    JSON.stringify({
      applinks: {
        details: configured
          ? [
              {
                appIDs: [appID],
                components: paths.map((path) => ({ "/": path })),
              },
            ]
          : [],
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
};
