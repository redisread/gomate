import { Hono } from "hono";
import type { Env } from "../../lib/auth";

import queries from "./queries";
import mutations from "./mutations";
import membership from "./membership";
import status from "./status";
import checklist from "./checklist";
import recommendOnboarding from "./recommend-onboarding";

const teams = new Hono<{ Bindings: Env }>();

// Mount onboarding recommend route FIRST (task #187 P1-1 T1)
// GET /teams/recommend-onboarding — 必须先于 queries 的 GET /:id 挂载，
// 否则 "recommend-onboarding" 被 :id 参数段吃掉返回 404
teams.route("/", recommendOnboarding);

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

// Mount checklist routes (task #163 Team「行动本」)
// PUT    /teams/:id/checklist
// POST   /teams/:id/checklist/assignments/:assignmentId/claim
// DELETE /teams/:id/checklist/assignments/:assignmentId/claim
teams.route("/", checklist);

export default teams;
export { teams as teamsRoute };
