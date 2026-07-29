import { Hono } from "hono";
import type { Env } from "../../lib/auth";
import { teamsRoute } from "./teams";
import { locationsRoute } from "./locations";
import { enumsRoute } from "./enums";
import { storiesRoute } from "./stories";
import { writeTeams } from "./write/teams";
import { writeMembers } from "./write/members";
import { writeLocations } from "./write/locations";
import { writeStories } from "./write/stories";

const v1 = new Hono<{ Bindings: Env }>();

// Serve openapi.json for tooling discovery (GET /v1/openapi.json)
import openapiSpec from "./openapi.json";
v1.get("/openapi.json", (c) => c.json(openapiSpec));

// Read routes
v1.route("/teams", teamsRoute);
v1.route("/locations", locationsRoute);
v1.route("/enums", enumsRoute);
v1.route("/stories", storiesRoute);

// Write routes (#217 P2-1)
v1.route("/teams", writeTeams); // POST /v1/teams
v1.route("/teams", writeMembers); // POST /v1/teams/:teamId/members
v1.route("/locations", writeLocations); // POST /v1/locations
v1.route("/stories", writeStories); // POST /v1/stories

export { v1 as v1Route };
