import { Hono } from "hono";
import type { Env } from "../../lib/auth";
import { teamsRoute } from "./teams";
import { locationsRoute } from "./locations";
import { enumsRoute } from "./enums";
import { storiesRoute } from "./stories";

const v1 = new Hono<{ Bindings: Env }>();

// Serve openapi.json for tooling discovery (GET /v1/openapi.json)
import openapiSpec from "./openapi.json";
v1.get("/openapi.json", (c) => c.json(openapiSpec));

v1.route("/teams", teamsRoute);
v1.route("/locations", locationsRoute);
v1.route("/enums", enumsRoute);
v1.route("/stories", storiesRoute);

export { v1 as v1Route };
