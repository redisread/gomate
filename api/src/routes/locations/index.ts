import { Hono } from "hono";
import type { Env } from "../../lib/auth";

import queries from "./queries";
import mutations from "./mutations";
import { locationsTransportationRoute } from "./transportation";

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

// P0-B T2 (task #169): GET /locations/:id/transportation
// amap 决策数据聚合（地铁/自驾/mapUrl）+ KV cache 24h + 7d stale
locations.route("/", locationsTransportationRoute);

export default locations;
export { locations as locationsRoute };
