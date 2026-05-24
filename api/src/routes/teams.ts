// This file re-exports from the teams/ directory for backward compatibility
// The teams routes have been split into multiple files:
// - teams/queries.ts    - GET endpoints
// - teams/mutations.ts - POST /, PUT /:id, DELETE /:id, POST /:id/form, POST /:id/cancel
// - teams/membership.ts - POST /:id/join, POST /:id/members/:userId/*, POST /:id/leave-request
// - teams/status.ts     - POST /:id/leave, POST /:id/cancel-application, POST /:id/members/:userId/approve-leave, POST /:id/members/:userId/reject-leave
// - teams/utils.ts      - Shared utility functions
// - teams/index.ts      - Main router that combines all routes

import teams from "./teams/index";

export { teams };
export { teams as teamsRoute };
export { default } from "./teams/index";
