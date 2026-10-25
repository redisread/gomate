import { createApiApp } from "../../lib/openapi";

import queries from "./queries";
import random from "./random";
import mutations from "./mutations";

const locations = createApiApp();

// Mount query routes (GET endpoints)
// GET /locations
// GET /locations/:id
// GET /locations/:id/tags
locations.route("/", random);
locations.route("/", queries);

// Mount mutation routes (POST, PUT, DELETE)
// POST /locations
// PUT /locations
// DELETE /locations/:id
// PUT /locations/:id/tags
locations.route("/", mutations);

// task #203: GET /locations/:id/transportation deleted (amap removed)

export default locations;
export { locations as locationsRoute };
