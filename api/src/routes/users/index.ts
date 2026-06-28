import { Hono } from "hono";
import type { Env } from "../../lib/auth";

import queries from "./queries";
import mutations from "./mutations";

const users = new Hono<{ Bindings: Env }>();

// Mount query routes (GET endpoints)
// GET /users?id={userId}
// GET /users/pending-approvals
// GET /users/applications
// GET /users/teams/joined
// GET /users/created-teams
// GET /users/:id
users.route("/", queries);

// Mount mutation routes (POST, PUT, PATCH, DELETE)
// PATCH /users/update
users.route("/", mutations);

export default users;
export { users as usersRoute };
