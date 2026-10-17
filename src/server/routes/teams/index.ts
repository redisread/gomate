import { createApiApp } from "../../lib/openapi";

import queries from "./queries";
import mutations from "./mutations";
import membership from "./membership";
import checklist from "./checklist";

const teams = createApiApp();

// Mount query routes (GET endpoints)
// GET /teams
// GET /teams/:id
// GET /teams/:id/join-requests
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
// POST /teams/:id/join-requests/:requestId/approve
// POST /teams/:id/join-requests/:requestId/reject
// POST /teams/:id/join-requests/:requestId/cancel
// POST /teams/:id/members/:userId/remove
// POST /teams/:id/leave
teams.route("/:id", membership);

// Mount checklist routes (task #163 Team「行动本」)
// PUT    /teams/:id/checklist
// POST   /teams/:id/checklist/assignments/:assignmentId/claim
// DELETE /teams/:id/checklist/assignments/:assignmentId/claim
teams.route("/", checklist);

export default teams;
export { teams as teamsRoute };
