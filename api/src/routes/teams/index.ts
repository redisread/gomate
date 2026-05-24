import { Hono } from "hono";
import type { Env } from "../../lib/auth";

import queries from "./queries";
import mutations from "./mutations";
import membership from "./membership";
import status from "./status";

const teams = new Hono<{ Bindings: Env }>();

// Mount query routes (GET endpoints)
// GET /teams
// GET /teams/:id
// GET /teams/:id/applications
// GET /teams/:id/my-status
teams.route("/", queries);

// Mount mutation routes (POST, PUT, DELETE)
// POST /teams (create)
// PUT /teams/:id (update)
// DELETE /teams/:id (delete)
// POST /teams/:id/form
// POST /teams/:id/cancel
teams.route("/", mutations);

// Mount membership routes under /:id
// POST /teams/:id/join
// POST /teams/:id/members/:userId/approve
// POST /teams/:id/members/:userId/reject
// POST /teams/:id/members/:userId/remove
// POST /teams/:id/leave-request
teams.route("/:id", membership);

// Mount status-related routes under /:id
// POST /teams/:id/leave
// POST /teams/:id/cancel-application
// POST /teams/:id/members/:userId/approve-leave
// POST /teams/:id/members/:userId/reject-leave
teams.route("/:id", status);

export default teams;
export { teams as teamsRoute };
