import { Hono } from "hono";
import type { Env } from "../../lib/auth";
import { teamsRoute } from "./teams";
import { locationsRoute } from "./locations";
import { enumsRoute } from "./enums";
import { storiesRoute } from "./stories";
import openapiSpec from "./openapi.json";

const v1 = new Hono<{ Bindings: Env }>();

v1.route("/teams", teamsRoute);
v1.route("/locations", locationsRoute);
v1.route("/enums", enumsRoute);
v1.route("/stories", storiesRoute);

// Serve openapi.json (for MCP / SDK consumers)
v1.get("/openapi.json", (c) => c.json(openapiSpec));

export { v1 as v1Route };
