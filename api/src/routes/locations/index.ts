import { Hono } from "hono";
import type { Env } from "../../lib/auth";

import queries from "./queries";
import mutations from "./mutations";

const locations = new Hono<{ Bindings: Env }>();

// Mount query routes (GET endpoints)
// GET /locations
// GET /locations/:id
// GET /locations/:id/tags
locations.route("/", queries);

// Mount mutation routes (POST, PUT, DELETE)
// POST /locations
// PUT /locations
// DELETE /locations/:id
// PUT /locations/:id/tags
locations.route("/", mutations);

export default locations;
export { locations as locationsRoute };
